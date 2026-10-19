import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicRequestForm } from "./public-request-form";

describe("PublicRequestForm", () => {
  it("keeps the assistant optional and applies its safe draft proposal", async () => {
    const assistantAction = vi.fn().mockResolvedValue({
      schema_version: "ai-intake-turn-v1",
      status: "collecting",
      assistant_message: "Tell me more about the result you need.",
      draft_patch: {
        service_category: "it_software",
        request_title: "Internal support portal",
        description: "We need a portal that organizes support requests.",
      },
      next_field: "consent",
      citations: [],
      handoff_reason: null,
    });
    render(
      <PublicRequestForm
        action={vi.fn()}
        assistantAction={assistantAction}
        assistantEnabled
        assistantSessionId="signed_session_token_123"
        consentVersion="consent-en-v1"
        locale="en"
        organizationDate="2026-10-16"
        publicId="opshub-demo-request-form"
      />,
    );

    expect(screen.queryByLabelText("Message to assistant")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Use the assistant" }));
    expect(
      screen.getByText(/Do not share passwords, payment details/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/may send your message to an external AI provider/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message to assistant"), {
      target: { value: "We need a portal for support requests." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask assistant" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Service category")).toHaveValue(
        "it_software",
      );
    });
    expect(screen.getByLabelText("Request title")).toHaveValue(
      "Internal support portal",
    );
    expect(screen.getByLabelText("Description")).toHaveValue(
      "We need a portal that organizes support requests.",
    );
    expect(
      screen.getByText("Tell me more about the result you need."),
    ).toBeInTheDocument();
  });

  it("keeps the fixed form available when the assistant request is interrupted", async () => {
    const assistantAction = vi
      .fn()
      .mockRejectedValue(new Error("connection interrupted"));
    render(
      <PublicRequestForm
        action={vi.fn()}
        assistantAction={assistantAction}
        assistantEnabled
        assistantSessionId="signed_session_token_123"
        consentVersion="consent-en-v1"
        locale="en"
        organizationDate="2026-10-16"
        publicId="opshub-demo-request-form"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use the assistant" }));
    fireEvent.change(screen.getByLabelText("Message to assistant"), {
      target: { value: "We need help with our website." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask assistant" }));

    expect(
      await screen.findByText(
        "The assistant is unavailable. Continue with the normal form.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send request" })).toBeEnabled();
    expect(screen.getByLabelText("Message to assistant")).toHaveValue(
      "We need help with our website.",
    );
  });

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

  it("moves keyboard focus to the validation summary", () => {
    const { container } = render(
      <PublicRequestForm
        action={vi.fn()}
        consentVersion="consent-en-v1"
        locale="en"
        organizationDate="2026-10-16"
        publicId="opshub-demo-request-form"
      />,
    );

    fireEvent.submit(container.querySelector("form")!);

    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("exposes browser autofill hints for contact and company details", () => {
    render(
      <PublicRequestForm
        action={vi.fn()}
        consentVersion="consent-en-v1"
        locale="en"
        organizationDate="2026-10-16"
        publicId="opshub-demo-request-form"
      />,
    );

    expect(screen.getByLabelText("Contact name")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Phone")).toHaveAttribute(
      "autocomplete",
      "tel",
    );

    fireEvent.click(screen.getByLabelText("Company"));
    expect(screen.getByLabelText("Company name")).toHaveAttribute(
      "autocomplete",
      "organization",
    );
    expect(screen.getByLabelText("Job title (optional)")).toHaveAttribute(
      "autocomplete",
      "organization-title",
    );
  });
});
