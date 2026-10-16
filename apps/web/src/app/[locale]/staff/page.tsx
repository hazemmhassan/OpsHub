import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import { StaffHome } from "@/components/staff-home";
import { StaffLoading } from "@/components/staff-loading";
import { routing } from "@/i18n/routing";

import { signOut } from "./actions";

type StaffPageProps = {
  params: Promise<{ locale: string }>;
};

export default function StaffPage(props: StaffPageProps) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <StaffPageContent {...props} />
    </Suspense>
  );
}

async function StaffPageContent({ params }: StaffPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const access = await getStaffAccess();

  if (access.status === "signed-out") {
    redirect(`/${locale}/staff/sign-in`);
  }

  if (access.status === "access-denied") {
    redirect(`/${locale}/staff/access-denied`);
  }

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const staff = await getTranslations("StaffHome");
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
      <StaffHome
        action={localizedSignOut}
        copy={{
          eyebrow: staff("eyebrow"),
          title: staff("title"),
          description: staff("description"),
          emptyTitle: staff("emptyTitle"),
          emptyDescription: staff("emptyDescription"),
          organizationLabel: staff("organizationLabel"),
          roleLabel: staff(`roles.${access.role}`),
          signOut: staff("signOut"),
        }}
        organizationName={access.organizationName}
      />
    </div>
  );
}
