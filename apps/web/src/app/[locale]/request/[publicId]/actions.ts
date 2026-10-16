"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerEnvironment } from "@/env/server";
import type { AppLocale } from "@/i18n/locale";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRequestInput } from "@/requests/request-input";
import {
  createSubmissionSubjectHash,
  getOrganizationDate,
} from "@/requests/public-submission";

const routeSchema = z.object({
  locale: z.enum(["ar", "en"]),
  publicId: z.string().regex(/^[A-Za-z0-9_-]{20,120}$/u),
  idempotencyKey: z.uuid(),
});

type PublicFormRecord = {
  id: string;
  form_version: number;
  consent_text_version_ar: string;
  consent_text_version_en: string;
  organizations: { timezone: string } | { timezone: string }[];
};

function getTimezone(organizations: PublicFormRecord["organizations"]): string {
  return Array.isArray(organizations)
    ? (organizations[0]?.timezone ?? "UTC")
    : organizations.timezone;
}

function errorPath(locale: AppLocale, publicId: string, error: string) {
  return `/${locale}/request/${publicId}?error=${error}`;
}

export async function submitPublicRequest(
  expectedLocale: AppLocale,
  expectedPublicId: string,
  formData: FormData,
): Promise<void> {
  const route = routeSchema.safeParse({
    locale: expectedLocale,
    publicId: expectedPublicId,
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!route.success) {
    redirect(`/${expectedLocale}`);
  }

  if (String(formData.get("website") ?? "").trim()) {
    redirect(errorPath(route.data.locale, route.data.publicId, "invalid"));
  }

  const supabase = createServiceClient();
  const { data: formDataRecord, error: formError } = await supabase
    .from("public_forms")
    .select(
      "id, form_version, consent_text_version_ar, consent_text_version_en, organizations!inner(timezone)",
    )
    .eq("public_id", route.data.publicId)
    .eq("is_active", true)
    .maybeSingle();

  if (formError || !formDataRecord) {
    redirect(errorPath(route.data.locale, route.data.publicId, "unavailable"));
  }

  const publicForm = formDataRecord as unknown as PublicFormRecord;
  const requestHeaders = await headers();
  const networkSubject =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  const serverEnv = getServerEnvironment();
  const subjectHash = createSubmissionSubjectHash(
    publicForm.id,
    networkSubject,
    serverEnv.PUBLIC_SUBMISSION_RATE_LIMIT_KEY,
  );
  const { data: budget, error: budgetError } = await supabase.rpc(
    "consume_public_submission_rate_limit",
    {
      p_public_form_id: publicForm.id,
      p_subject_hash: `\\x${subjectHash}`,
    },
  );

  if (budgetError || !budget?.[0]?.allowed) {
    redirect(errorPath(route.data.locale, route.data.publicId, "rate"));
  }

  const consentTextVersion =
    route.data.locale === "ar"
      ? publicForm.consent_text_version_ar
      : publicForm.consent_text_version_en;
  let input: ReturnType<typeof parseRequestInput>;

  try {
    input = parseRequestInput(
      {
        requesterType: formData.get("requesterType"),
        contactName: formData.get("contactName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        countryCode: formData.get("countryCode"),
        serviceCategory: formData.get("serviceCategory"),
        requestTitle: formData.get("requestTitle"),
        description: formData.get("description"),
        desiredStartDate: formData.get("desiredStartDate"),
        preferredContactMethod: formData.get("preferredContactMethod"),
        submittedLocale: route.data.locale,
        consentTextVersion,
        consent: formData.get("consent") === "on",
        companyName: formData.get("companyName"),
        jobTitle: formData.get("jobTitle"),
        companyWebsite: formData.get("companyWebsite"),
      },
      getOrganizationDate(getTimezone(publicForm.organizations)),
    );
  } catch {
    redirect(errorPath(route.data.locale, route.data.publicId, "invalid"));
  }

  const { data: submission, error: submissionError } = await supabase.rpc(
    "submit_request",
    {
      p_public_id: route.data.publicId,
      p_idempotency_key: route.data.idempotencyKey,
      p_requester_type: input.requesterType,
      p_contact_name: input.contactName,
      p_email: input.email,
      p_phone_raw: input.phoneRaw,
      p_phone_e164: input.phoneE164,
      p_country_code: input.countryCode,
      p_phone_country_mismatch: input.phoneCountryMismatch,
      p_service_category: input.serviceCategory,
      p_request_title: input.requestTitle,
      p_description: input.description,
      p_desired_start_date: input.desiredStartDate,
      p_preferred_contact_method: input.preferredContactMethod,
      p_submitted_locale: input.submittedLocale,
      p_consent_text_version: input.consentTextVersion,
      p_company_name: input.companyName,
      p_job_title: input.jobTitle,
      p_company_website: input.companyWebsite,
    },
  );

  const reference = submission?.[0]?.reference;
  if (submissionError || typeof reference !== "string") {
    redirect(errorPath(route.data.locale, route.data.publicId, "submission"));
  }

  redirect(`/${route.data.locale}/request/confirmation?reference=${reference}`);
}
