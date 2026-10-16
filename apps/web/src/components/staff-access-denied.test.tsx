import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffAccessDenied } from "./staff-access-denied";

describe("StaffAccessDenied", () => {
  it("explains the safe next step without exposing organization details", () => {
    render(
      <StaffAccessDenied
        action={vi.fn()}
        copy={{
          eyebrow: "Access check",
          title: "You do not have access yet",
          description:
            "Your account is valid, but it is not connected to an active team.",
          guidance: "Ask your team administrator to activate your access.",
          signOut: "Sign out",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "You do not have access yet" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(screen.queryByText(/organization id/i)).not.toBeInTheDocument();
  });
});
