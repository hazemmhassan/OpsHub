import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import { StaffLoading } from "@/components/staff-loading";
import {
  StaffRequestDetail,
  type StaffRequestDetailRecord,
} from "@/components/staff-request-detail";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

import { decideRequestAction, startReviewAction } from "./actions";

type DetailPageProps = {
  params: Promise<{ locale: string; requestId: string }>;
  searchParams: Promise<{ error?: string }>;
};
type RequestRow = {
  id: string;
  reference: string;
  status: string;
  submitted_at: string;
  review_started_at: string | null;
  decided_at: string | null;
};
type SnapshotRow = {
  requester_type: string;
  contact_name: string;
  email: string;
  phone_raw: string;
  phone_e164: string;
  country_code: string;
  service_category: string;
  request_title: string;
  description: string;
  desired_start_date: string | null;
  preferred_contact_method: string | null;
  submitted_locale: string;
  company_name: string | null;
  job_title: string | null;
  company_website: string | null;
};

const errors = {
  en: {
    conflict:
      "This request changed before your action completed. The latest state is shown below.",
    invalid: "Add a clear rejection reason and try again.",
  },
  ar: {
    conflict: "تغيّرت حالة الطلب قبل اكتمال الإجراء. تظهر أحدث حالة أدناه.",
    invalid: "أضف سبباً واضحاً للرفض ثم حاول مرة أخرى.",
  },
} as const;

export default function StaffRequestPage(props: DetailPageProps) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <StaffRequestPageContent {...props} />
    </Suspense>
  );
}

async function StaffRequestPageContent({
  params,
  searchParams,
}: DetailPageProps) {
  const { locale, requestId } = await params;
  if (
    !hasLocale(routing.locales, locale) ||
    !z.uuid().safeParse(requestId).success
  )
    notFound();
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect(`/${locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${locale}/staff/access-denied`);

  const supabase = await createClient();
  const [requestResult, snapshotResult, decisionResult, timelineResult] =
    await Promise.all([
      supabase
        .from("requests")
        .select(
          "id, reference, status, submitted_at, review_started_at, decided_at",
        )
        .eq("id", requestId)
        .maybeSingle(),
      supabase
        .from("request_submission_snapshots")
        .select(
          "requester_type, contact_name, email, phone_raw, phone_e164, country_code, service_category, request_title, description, desired_start_date, preferred_contact_method, submitted_locale, company_name, job_title, company_website",
        )
        .eq("request_id", requestId)
        .maybeSingle(),
      supabase
        .from("approval_decisions")
        .select("decision, reason, actor_role, created_at")
        .eq("request_id", requestId)
        .maybeSingle(),
      supabase
        .from("audit_events")
        .select("id, event_type, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
    ]);
  if (
    requestResult.error ||
    snapshotResult.error ||
    decisionResult.error ||
    timelineResult.error
  )
    throw new Error("Unable to load request details.");
  if (!requestResult.data || !snapshotResult.data) notFound();

  const row = requestResult.data as unknown as RequestRow;
  const snapshot = snapshotResult.data as unknown as SnapshotRow;
  const request: StaffRequestDetailRecord = {
    id: row.id,
    reference: row.reference,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewStartedAt: row.review_started_at,
    decidedAt: row.decided_at,
    requesterType: snapshot.requester_type,
    contactName: snapshot.contact_name,
    email: snapshot.email,
    phoneRaw: snapshot.phone_raw,
    phoneE164: snapshot.phone_e164,
    countryCode: snapshot.country_code,
    serviceCategory: snapshot.service_category,
    title: snapshot.request_title,
    description: snapshot.description,
    desiredStartDate: snapshot.desired_start_date,
    preferredContactMethod: snapshot.preferred_contact_method,
    submittedLocale: snapshot.submitted_locale,
    companyName: snapshot.company_name,
    jobTitle: snapshot.job_title,
    companyWebsite: snapshot.company_website,
  };

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const query = await searchParams;
  const errorKey = query.error as
    keyof (typeof errors)[typeof locale] | undefined;
  const decisionData = decisionResult.data as {
    decision: string;
    reason: string | null;
    actor_role: string;
    created_at: string;
  } | null;

  return (
    <div className="page-shell staff-shell">
      <SiteHeader
        area="staff"
        locale={locale}
        labels={{
          brand: common("brand"),
          home: common("home"),
          teamWorkspace: common("teamWorkspace"),
          languages: { ar: common("arabic"), en: common("english") },
        }}
      />
      <StaffRequestDetail
        decideAction={decideRequestAction.bind(null, locale, requestId)}
        decision={
          decisionData
            ? {
                decision: decisionData.decision,
                reason: decisionData.reason,
                actorRole: decisionData.actor_role,
                createdAt: decisionData.created_at,
              }
            : null
        }
        error={errorKey ? errors[locale][errorKey] : null}
        locale={locale}
        request={request}
        startReviewAction={startReviewAction.bind(null, locale, requestId)}
        timeline={(timelineResult.data ?? []).map((event) => ({
          id: String(event.id),
          eventType: event.event_type,
          createdAt: event.created_at,
        }))}
      />
    </div>
  );
}
