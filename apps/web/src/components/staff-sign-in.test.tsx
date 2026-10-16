import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffSignIn } from "./staff-sign-in";

const copy = {
  eyebrow: "Team workspace",
  title: "Welcome back",
  description: "Sign in to review and manage your team's requests.",
  emailLabel: "Email",
  passwordLabel: "Password",
  submit: "Sign in",
  submitting: "Signing in...",
  invalidCredentials: "The email or password is incorrect.",
};

describe("StaffSignIn", () => {
  it("renders an accessible email and password form", () => {
    render(
      <StaffSignIn
        action={vi.fn()}
        copy={copy}
        initialState={{ status: "idle" }}
        locale="en"
      />,
    );

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("announces a generic authentication failure", () => {
    render(
      <StaffSignIn
        action={vi.fn()}
        copy={copy}
        initialState={{ status: "invalid-credentials" }}
        locale="en"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The email or password is incorrect.",
    );
  });
});
