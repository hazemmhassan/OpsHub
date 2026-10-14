import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { StaffHome } from "@/components/staff-home";
import { routing } from "@/i18n/routing";

type StaffPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function StaffPage({ params }: StaffPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const staff = await getTranslations("StaffHome");

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
        copy={{
          eyebrow: staff("eyebrow"),
          title: staff("title"),
          description: staff("description"),
          emptyTitle: staff("emptyTitle"),
          emptyDescription: staff("emptyDescription"),
        }}
      />
    </div>
  );
}
