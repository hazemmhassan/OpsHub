import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

import { LocaleSwitcher } from "./locale-switcher";

type SiteHeaderProps = {
  locale: AppLocale;
  labels: {
    brand: string;
    home: string;
    teamWorkspace: string;
    languages: Record<AppLocale, string>;
  };
  area: "public" | "staff";
};

export function SiteHeader({ locale, labels, area }: SiteHeaderProps) {
  const destination = area === "public" ? `/${locale}/staff` : `/${locale}`;
  const destinationLabel =
    area === "public" ? labels.teamWorkspace : labels.home;

  return (
    <>
      <a className="skip-link" href="#main-content">
        {locale === "ar" ? "انتقل إلى المحتوى الرئيسي" : "Skip to main content"}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href={`/${locale}`}>
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span dir="ltr" translate="no">
              {labels.brand}
            </span>
          </Link>

          <div className="header-actions">
            <Link className="area-link" href={destination}>
              {destinationLabel}
            </Link>
            <LocaleSwitcher currentLocale={locale} labels={labels.languages} />
          </div>
        </div>
      </header>
    </>
  );
}
