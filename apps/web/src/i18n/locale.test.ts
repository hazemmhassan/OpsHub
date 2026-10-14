import { describe, expect, it } from "vitest";

import { getTextDirection, localizePathname, type AppLocale } from "./locale";

describe("getTextDirection", () => {
  it.each<[AppLocale, "rtl" | "ltr"]>([
    ["ar", "rtl"],
    ["en", "ltr"],
  ])("returns the correct direction for %s", (locale, direction) => {
    expect(getTextDirection(locale)).toBe(direction);
  });
});

describe("localizePathname", () => {
  it("keeps the current destination when the locale changes", () => {
    expect(localizePathname("/ar/staff", "en")).toBe("/en/staff");
    expect(localizePathname("/en/staff", "ar")).toBe("/ar/staff");
  });

  it("adds the locale when the pathname does not contain one", () => {
    expect(localizePathname("/staff", "ar")).toBe("/ar/staff");
  });

  it("returns the localized home for an empty pathname", () => {
    expect(localizePathname("/", "en")).toBe("/en");
  });
});
