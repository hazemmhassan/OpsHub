"use client";

import { usePathname } from "next/navigation";

import type { AppLocale } from "@/i18n/locale";

import { LocaleLinks } from "./locale-links";

type LocaleSwitcherProps = {
  currentLocale: AppLocale;
  labels: Record<AppLocale, string>;
};

export function LocaleSwitcher({ currentLocale, labels }: LocaleSwitcherProps) {
  const pathname = usePathname();

  return (
    <LocaleLinks
      currentLocale={currentLocale}
      currentPathname={pathname}
      labels={labels}
    />
  );
}
