import { Suspense } from "react";

import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PublicRequestForm } from "@/components/public-request-form";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrganizationDate } from "@/requests/public-submission";

import { submitPublicRequest } from "./actions";

type RequestPageProps = {
  params: Promise<{ locale: string; publicId: string }>;
  searchParams: Promise<{ error?: string }>;
};

type PublicFormRecord = {
  consent_text_version_ar: string;
  consent_text_version_en: string;
  organizations: { timezone: string } | { timezone: string }[];
};

const errors = {
  en: {
    invalid: "Please review your information and try again.",
    rate: "Too many attempts. Please wait a few minutes and try again.",
    unavailable: "This request form is not available right now.",
    submission: "We could not send your request. Please try again.",
  },
  ar: {
    invalid: "راجع بياناتك وحاول مرة أخرى.",
    rate: "عدد المحاولات كبير. انتظر بضع دقائق ثم حاول مرة أخرى.",
    unavailable: "نموذج الطلب غير متاح حالياً.",
    submission: "تعذر إرسال طلبك. حاول مرة أخرى.",
  },
} as const;

export default function RequestPage(props: RequestPageProps) {
  return (
    <Suspense fallback={<RequestFormLoading />}>
      <RequestPageContent {...props} />
    </Suspense>
  );
}

function RequestFormLoading() {
  return (
    <main className="request-form-shell" aria-busy="true">
      <div className="request-form">
        <div className="staff-loading-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}

async function RequestPageContent({ params, searchParams }: RequestPageProps) {
  await connection();
  const { locale, publicId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("public_forms")
    .select(
      "consent_text_version_ar, consent_text_version_en, organizations!inner(timezone)",
    )
    .eq("public_id", publicId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const form = data as unknown as PublicFormRecord;
  const timezone = Array.isArray(form.organizations)
    ? form.organizations[0]?.timezone
    : form.organizations.timezone;
  if (!timezone) {
    notFound();
  }

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const query = await searchParams;
  const errorKey = query.error as
    keyof (typeof errors)[typeof locale] | undefined;
  const localizedAction = submitPublicRequest.bind(null, locale, publicId);

  return (
    <div className="page-shell">
      <SiteHeader
        area="public"
        locale={locale}
        labels={{
          brand: common("brand"),
          home: common("home"),
          teamWorkspace: common("teamWorkspace"),
          languages: { ar: common("arabic"), en: common("english") },
        }}
      />
      <PublicRequestForm
        action={localizedAction}
        consentVersion={
          locale === "ar"
            ? form.consent_text_version_ar
            : form.consent_text_version_en
        }
        locale={locale}
        organizationDate={getOrganizationDate(timezone)}
        publicId={publicId}
        serverError={errorKey ? errors[locale][errorKey] : null}
      />
    </div>
  );
}
