export const locales = ["ar", "en"] as const;

export type AppLocale = (typeof locales)[number];

export function getTextDirection(locale: AppLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function localizePathname(
  pathname: string,
  targetLocale: AppLocale,
): string {
  const segments = pathname.split("/").filter(Boolean);

  if (locales.some((locale) => locale === segments[0])) {
    segments[0] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }

  return `/${segments.join("/")}`;
}
