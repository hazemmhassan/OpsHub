import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApprovalConfirmation } from "./approval-confirmation";

describe("ApprovalConfirmation", () => {
  it("requires an explicit confirmation before exposing the submit button", () => {
    render(<ApprovalConfirmation locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Approve request" }));

    expect(
      screen.getByText(
        "Approve this request and create its pending delivery job?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm approval" }),
    ).toHaveAttribute("type", "submit");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("button", { name: "Confirm approval" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve request" }),
    ).toBeInTheDocument();
  });
});
