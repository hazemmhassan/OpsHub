import { defineRouting } from "next-intl/routing";

import { locales } from "./locale";

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  localePrefix: "always",
});
