import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StaffDeliveries } from "./staff-deliveries";

describe("StaffDeliveries", () => {
  it("shows actionable delivery health without exposing sensitive data", () => {
    render(
      <StaffDeliveries
        deliveries={[
          {
            id: "00000000-0000-4000-8000-000000000901",
            requestId: "00000000-0000-4000-8000-000000000801",
            requestReference: "01ABCDEFGH",
            requestTitle: "Operations team training",
            status: "failed",
            attemptCount: 2,
            maxAttempts: 5,
            updatedAt: "2026-10-17T10:00:00Z",
          },
        ]}
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Delivery diagnostics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("2 of 5 attempts")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Operations team training/ }),
    ).toHaveAttribute(
      "href",
      "/en/staff/deliveries/00000000-0000-4000-8000-000000000901",
    );
    expect(screen.queryByText(/payload/i)).not.toBeInTheDocument();
  });

  it("renders a useful empty state", () => {
    render(<StaffDeliveries deliveries={[]} locale="ar" />);

    expect(screen.getByText("لا توجد مهام تسليم بعد")).toBeInTheDocument();
  });
});
