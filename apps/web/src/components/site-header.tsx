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
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href={`/${locale}`} aria-label={labels.brand}>
          <span className="brand-mark" aria-hidden="true">
            O
          </span>
          <span dir="ltr">{labels.brand}</span>
        </Link>

        <div className="header-actions">
          <Link className="area-link" href={destination}>
            {destinationLabel}
          </Link>
          <LocaleSwitcher currentLocale={locale} labels={labels.languages} />
        </div>
      </div>
    </header>
  );
}
