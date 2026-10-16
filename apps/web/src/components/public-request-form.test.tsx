import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicRequestForm } from "./public-request-form";

describe("PublicRequestForm", () => {
  it("shows the complete request contract and company branch", () => {
    render(
      <PublicRequestForm
        action={vi.fn()}
        consentVersion="consent-en-v1"
        locale="en"
        organizationDate="2026-10-16"
        publicId="opshub-demo-request-form"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Tell us what you need" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Contact name")).toBeRequired();
    expect(screen.getByLabelText("Description")).toHaveAttribute(
      "maxlength",
      "2000",
    );
    expect(screen.getByRole("button", { name: "Send request" })).toBeEnabled();

    const keyBefore = document.querySelector<HTMLInputElement>(
      'input[name="idempotencyKey"]',
    )?.value;
    fireEvent.click(screen.getByLabelText("Company"));
    expect(screen.getByLabelText("Company name")).toBeRequired();
    expect(
      document.querySelector<HTMLInputElement>('input[name="idempotencyKey"]')
        ?.value,
    ).toBe(keyBefore);
  });
});
