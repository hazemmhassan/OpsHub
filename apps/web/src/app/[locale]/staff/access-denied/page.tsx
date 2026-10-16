import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import { StaffAccessDenied } from "@/components/staff-access-denied";
import { StaffLoading } from "@/components/staff-loading";
import { routing } from "@/i18n/routing";

import { signOut } from "../actions";

type AccessDeniedPageProps = {
  params: Promise<{ locale: string }>;
};

export default function AccessDeniedPage(props: AccessDeniedPageProps) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <AccessDeniedPageContent {...props} />
    </Suspense>
  );
}

async function AccessDeniedPageContent({ params }: AccessDeniedPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const access = await getStaffAccess();

  if (access.status === "signed-out") {
    redirect(`/${locale}/staff/sign-in`);
  }

  if (access.status === "authorized") {
    redirect(`/${locale}/staff`);
  }

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const denied = await getTranslations("StaffAccessDenied");
  const localizedSignOut = signOut.bind(null, locale);

  return (
    <div className="page-shell staff-shell">
      <SiteHeader
        area="staff"
        locale={locale}
        labels={{
          brand: common("brand"),
          home: common("home"),
          teamWorkspace: common("teamWorkspace"),
          languages: {
            ar: common("arabic"),
            en: common("english"),
          },
        }}
      />
      <StaffAccessDenied
        action={localizedSignOut}
        copy={{
          eyebrow: denied("eyebrow"),
          title: denied("title"),
          description: denied("description"),
          guidance: denied("guidance"),
          signOut: denied("signOut"),
        }}
      />
    </div>
  );
}
