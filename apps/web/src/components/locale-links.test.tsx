import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    prefetch,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean }) => (
    <a data-prefetch={String(prefetch)} {...props} />
  ),
}));

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
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "data-prefetch",
      "false",
    );
  });
});
