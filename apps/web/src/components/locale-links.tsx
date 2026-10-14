import Link from "next/link";

import { locales, localizePathname, type AppLocale } from "@/i18n/locale";

type LocaleLinksProps = {
  currentLocale: AppLocale;
  currentPathname: string;
  labels: Record<AppLocale, string>;
};

export function LocaleLinks({
  currentLocale,
  currentPathname,
  labels,
}: LocaleLinksProps) {
  return (
    <nav aria-label={currentLocale === "ar" ? "اللغة" : "Language"}>
      <ul className="locale-links">
        {locales.map((locale) => (
          <li key={locale}>
            <Link
              aria-current={locale === currentLocale ? "page" : undefined}
              className="locale-link"
              href={localizePathname(currentPathname, locale)}
              hrefLang={locale}
              lang={locale}
            >
              {labels[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
