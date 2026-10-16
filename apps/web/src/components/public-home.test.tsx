import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHome } from "./public-home";

describe("PublicHome", () => {
  it("presents the service request entry point with an accessible heading", () => {
    render(
      <PublicHome
        copy={{
          eyebrow: "Service requests, organized",
          title: "A clearer way to receive and manage client requests",
          description:
            "Keep every request visible from submission to delivery.",
          formNote: "Each team shares its own request form directly.",
          requestAction: "Send a service request",
          staffAction: "Open the team workspace",
          benefits: ["Clear intake", "Simple approvals", "Reliable delivery"],
        }}
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "A clearer way to receive and manage client requests",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send a service request" }),
    ).toHaveAttribute("href", "/en/request/opshub-demo-request-form");
    expect(
      screen.getByRole("link", { name: "Open the team workspace" }),
    ).toHaveAttribute("href", "/en/staff");
  });
});
