import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffDeliveryDetail } from "./staff-delivery-detail";

const delivery = {
  id: "00000000-0000-4000-8000-000000000901",
  requestId: "00000000-0000-4000-8000-000000000801",
  requestReference: "01ABCDEFGH",
  requestTitle: "Operations team training",
  status: "dead",
  attemptCount: 5,
  maxAttempts: 5,
  availableAt: "2026-10-17T10:00:00Z",
  lastAttemptAt: "2026-10-17T09:55:00Z",
  lastHttpStatus: 503,
  lastErrorCode: "http_error",
  lastErrorMessage: "The destination returned HTTP 503.",
  succeededAt: null,
  createdAt: "2026-10-17T09:00:00Z",
  updatedAt: "2026-10-17T09:55:00Z",
};

describe("StaffDeliveryDetail", () => {
  it("shows failure details and requires confirmation before retry", () => {
    render(
      <StaffDeliveryDetail
        delivery={delivery}
        locale="en"
        retryAction={vi.fn()}
        timeline={[
          {
            id: "1",
            eventType: "delivery_dead",
            createdAt: "2026-10-17T09:55:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("HTTP 503")).toBeInTheDocument();
    expect(
      screen.getByText("The destination returned HTTP 503."),
    ).toBeInTheDocument();
    expect(screen.getByText("Delivery stopped")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirm retry" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry delivery" }));
    expect(
      screen.getByText("Retry this delivery with one additional attempt?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm retry" }),
    ).toHaveAttribute("type", "submit");
  });

  it("does not offer retry while delivery is pending", () => {
    render(
      <StaffDeliveryDetail
        delivery={{ ...delivery, status: "pending" }}
        locale="en"
        retryAction={vi.fn()}
        timeline={[]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Retry delivery" }),
    ).not.toBeInTheDocument();
  });

  it("announces a successful retry as a status message", () => {
    render(
      <StaffDeliveryDetail
        delivery={{ ...delivery, status: "pending" }}
        locale="en"
        message="The delivery is queued for another attempt."
        messageTone="success"
        retryAction={vi.fn()}
        timeline={[]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "The delivery is queued for another attempt.",
    );
  });
});
