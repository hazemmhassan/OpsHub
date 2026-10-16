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
    expect(screen.getByLabelText("Preferred contact method")).toHaveValue("");
    expect(
      screen.getByRole("option", { name: "No preference" }),
    ).toBeInTheDocument();

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

  it("warns about a phone and country mismatch without blocking submission", () => {
    const action = vi.fn();
    const { container } = render(
      <PublicRequestForm
        action={action}
        consentVersion="consent-en-v1"
        locale="en"
        organizationDate="2026-10-16"
        publicId="opshub-demo-request-form"
      />,
    );

    fireEvent.change(screen.getByLabelText("Contact name"), {
      target: { value: "Hazem Hassan" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "hazem@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "+201001234567" },
    });
    fireEvent.change(screen.getByLabelText("Country"), {
      target: { value: "SA" },
    });
    fireEvent.change(screen.getByLabelText("Request title"), {
      target: { value: "Website support" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "We need help maintaining our company website." },
    });
    fireEvent.click(screen.getByLabelText(/I agree/));
    fireEvent.submit(container.querySelector("form")!);

    expect(
      screen.getByRole("status", {
        name: /phone number appears to belong to a different country/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
