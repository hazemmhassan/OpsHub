import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import { StaffLoading } from "@/components/staff-loading";
import { StaffSignIn } from "@/components/staff-sign-in";
import { routing } from "@/i18n/routing";

import { signIn } from "../actions";

type SignInPageProps = {
  params: Promise<{ locale: string }>;
};

export default function SignInPage(props: SignInPageProps) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <SignInPageContent {...props} />
    </Suspense>
  );
}

async function SignInPageContent({ params }: SignInPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const access = await getStaffAccess();

  if (access.status === "authorized") {
    redirect(`/${locale}/staff`);
  }

  if (access.status === "access-denied") {
    redirect(`/${locale}/staff/access-denied`);
  }

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const auth = await getTranslations("StaffAuth");

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
      <StaffSignIn
        action={signIn}
        copy={{
          eyebrow: auth("eyebrow"),
          title: auth("title"),
          description: auth("description"),
          emailLabel: auth("emailLabel"),
          passwordLabel: auth("passwordLabel"),
          submit: auth("submit"),
          submitting: auth("submitting"),
          invalidInput: auth("invalidInput"),
          invalidCredentials: auth("invalidCredentials"),
        }}
        initialState={{ status: "idle" }}
        locale={locale}
      />
    </div>
  );
}
