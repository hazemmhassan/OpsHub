import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PublicHome } from "@/components/public-home";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const home = await getTranslations("PublicHome");

  return (
    <div className="page-shell">
      <SiteHeader
        area="public"
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
      <PublicHome
        locale={locale}
        copy={{
          eyebrow: home("eyebrow"),
          title: home("title"),
          description: home("description"),
          formNote: home("formNote"),
          staffAction: home("staffAction"),
          benefits: [home("benefit1"), home("benefit2"), home("benefit3")],
        }}
      />
    </div>
  );
}
