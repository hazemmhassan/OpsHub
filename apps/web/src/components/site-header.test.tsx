import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
}));

describe("SiteHeader", () => {
  it("offers a localized keyboard shortcut to the main content", () => {
    render(
      <SiteHeader
        area="public"
        locale="en"
        labels={{
          brand: "OpsHub",
          home: "Home",
          teamWorkspace: "Team workspace",
          languages: { ar: "العربية", en: "English" },
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
  });
});
