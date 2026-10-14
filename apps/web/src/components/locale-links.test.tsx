import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocaleLinks } from "./locale-links";

describe("LocaleLinks", () => {
  it("marks the current locale and preserves the logical destination", () => {
    render(
      <LocaleLinks
        currentLocale="ar"
        currentPathname="/ar/staff"
        labels={{ ar: "العربية", en: "English" }}
      />,
    );

    expect(screen.getByRole("link", { name: "العربية" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/en/staff",
    );
  });
});
