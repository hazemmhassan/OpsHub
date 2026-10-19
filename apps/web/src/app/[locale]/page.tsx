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
          requestAction: home("requestAction"),
          staffAction: home("staffAction"),
          benefits: [home("benefit1"), home("benefit2"), home("benefit3")],
          workflowEyebrow: home("workflowEyebrow"),
          workflowTitle: home("workflowTitle"),
          workflowDescription: home("workflowDescription"),
          steps: [
            {
              title: home("step1Title"),
              description: home("step1Description"),
            },
            {
              title: home("step2Title"),
              description: home("step2Description"),
            },
            {
              title: home("step3Title"),
              description: home("step3Description"),
            },
          ],
          flowTitle: home("flowTitle"),
          flowSteps: [
            home("flow1"),
            home("flow2"),
            home("flow3"),
            home("flow4"),
          ],
          aiEyebrow: home("aiEyebrow"),
          aiTitle: home("aiTitle"),
          aiDescription: home("aiDescription"),
          aiPoints: [home("aiPoint1"), home("aiPoint2"), home("aiPoint3")],
          finalTitle: home("finalTitle"),
          finalDescription: home("finalDescription"),
          finalAction: home("finalAction"),
        }}
      />
    </div>
  );
}
