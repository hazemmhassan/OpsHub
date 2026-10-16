import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StaffRequests } from "./staff-requests";

describe("StaffRequests", () => {
  it("shows request status, requester, and language", () => {
    render(
      <StaffRequests
        locale="en"
        requests={[
          {
            id: "request-1",
            reference: "01ABCDEFGH",
            status: "submitted",
            submittedAt: "2026-10-16T10:00:00Z",
            title: "Operations support",
            contactName: "Mona Ali",
            submittedLocale: "ar",
          },
        ]}
      />,
    );

    const requestLink = screen.getByRole("link", {
      name: /Operations support/,
    });
    expect(requestLink).toHaveAttribute("href", "/en/staff/requests/request-1");
    expect(within(requestLink).getByText("Submitted")).toBeInTheDocument();
    expect(within(requestLink).getByText("Arabic")).toBeInTheDocument();
  });
});
