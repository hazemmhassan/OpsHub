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

const copy = {
  en: {
    eyebrow: "Protected workspace",
    title: "Administrator access required",
    description:
      "Delivery diagnostics and manual recovery are available only to administrators.",
    guidance:
      "Return to the request list or ask an administrator to review the delivery.",
    signOut: "Sign out",
  },
  ar: {
    eyebrow: "مساحة عمل محمية",
    title: "صلاحية المسؤول مطلوبة",
    description: "تشخيص التسليم والاستعادة اليدوية متاحان للمسؤولين فقط.",
    guidance: "ارجع إلى قائمة الطلبات أو اطلب من مسؤول مراجعة التسليم.",
    signOut: "تسجيل الخروج",
  },
} as const;

export default function AdminRequiredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <AdminRequiredPageContent params={params} />
    </Suspense>
  );
}

async function AdminRequiredPageContent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect(`/${locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${locale}/staff/access-denied`);
  if (access.role === "admin") redirect(`/${locale}/staff/deliveries`);

  setRequestLocale(locale);
  const common = await getTranslations("Common");
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
      <StaffAccessDenied
        action={signOut.bind(null, locale)}
        copy={copy[locale]}
      />
    </div>
  );
}
