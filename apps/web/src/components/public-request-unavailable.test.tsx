import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicRequestUnavailable } from "./public-request-unavailable";

describe("PublicRequestUnavailable", () => {
  it("explains a temporary outage without showing a 404", () => {
    render(
      <PublicRequestUnavailable
        locale="en"
        publicId="opshub-demo-request-form"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Request service is temporarily unavailable",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/en/request/opshub-demo-request-form",
    );
  });

  it("explains an invalid or inactive link without showing a generic 404", () => {
    render(
      <PublicRequestUnavailable
        locale="en"
        publicId="missing-form"
        reason="not-found"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "This request form is not available",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/link may be incorrect/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/en",
    );
    expect(screen.queryByRole("link", { name: "Try again" })).toBeNull();
  });
});
