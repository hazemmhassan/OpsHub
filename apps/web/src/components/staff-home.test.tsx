import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StaffHome } from "./staff-home";

const copy = {
  eyebrow: "Team workspace",
  title: "Requests",
  description: "Review incoming requests and keep work moving.",
  emptyTitle: "No requests yet",
  emptyDescription: "New service requests will appear here.",
};

describe("StaffHome", () => {
  it("renders an accessible empty requests state", () => {
    render(<StaffHome copy={copy} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Requests" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
  });
});
