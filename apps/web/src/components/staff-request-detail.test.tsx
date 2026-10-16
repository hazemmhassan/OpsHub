import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffRequestDetail } from "./staff-request-detail";

const request = {
  id: "00000000-0000-4000-8000-000000000801",
  reference: "01ABCDEFGH",
  status: "under_review",
  submittedAt: "2026-10-16T10:00:00Z",
  reviewStartedAt: "2026-10-16T10:05:00Z",
  decidedAt: null,
  requesterType: "company",
  contactName: "Mona Ali",
  email: "mona@example.test",
  phoneRaw: "0501234567",
  phoneE164: "+966501234567",
  countryCode: "SA",
  serviceCategory: "training",
  title: "Operations team training",
  description: "We need practical training for our operations team.",
  desiredStartDate: null,
  preferredContactMethod: "phone",
  submittedLocale: "ar",
  companyName: "Mona Company",
  jobTitle: "Operations Manager",
  companyWebsite: "https://example.test",
};

describe("StaffRequestDetail", () => {
  it("shows the immutable submission and final decision controls", () => {
    render(
      <StaffRequestDetail
        decideAction={vi.fn()}
        decision={null}
        locale="en"
        request={request}
        startReviewAction={vi.fn()}
        timeline={[
          {
            id: "1",
            eventType: "request_submitted",
            createdAt: "2026-10-16T10:00:00Z",
          },
          {
            id: "2",
            eventType: "review_started",
            createdAt: "2026-10-16T10:05:00Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Operations team training" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mona Company")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve request" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Rejection reason")).toBeRequired();
    expect(screen.getByText("Review started")).toBeInTheDocument();
  });

  it("shows Start Review before final decision controls", () => {
    render(
      <StaffRequestDetail
        decideAction={vi.fn()}
        decision={null}
        locale="en"
        request={{ ...request, status: "submitted", reviewStartedAt: null }}
        startReviewAction={vi.fn()}
        timeline={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Start review" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Approve request" }),
    ).not.toBeInTheDocument();
  });
});
