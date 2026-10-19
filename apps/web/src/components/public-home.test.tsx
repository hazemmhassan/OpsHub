import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHome } from "./public-home";

describe("PublicHome", () => {
  it("presents the complete request-to-delivery story with real entry points", () => {
    render(
      <PublicHome
        copy={{
          eyebrow: "Client operations, without the chaos",
          title: "Every request. One clear path forward.",
          description:
            "Collect the details, make a decision, and keep delivery moving.",
          formNote: "Try the demo request form. No account needed.",
          requestAction: "Start a request",
          staffAction: "Open team workspace",
          benefits: [
            "Arabic & English",
            "Clear approval history",
            "Reliable automation",
          ],
          workflowEyebrow: "Built for the way small teams work",
          workflowTitle: "From first message to finished handoff",
          workflowDescription:
            "One shared flow keeps clients and teams aligned.",
          steps: [
            {
              title: "Capture the details once",
              description: "A guided request keeps the essentials together.",
            },
            {
              title: "Review with context",
              description: "The team sees the request and decision history.",
            },
            {
              title: "Send approved work forward",
              description: "Reliable delivery records success and failure.",
            },
          ],
          flowTitle: "One request. Fully visible.",
          flowSteps: [
            "Request received",
            "Review started",
            "Decision recorded",
            "Delivery confirmed",
          ],
          aiEyebrow: "Optional AI assistance",
          aiTitle: "Help when it is useful. Control where it matters.",
          aiDescription:
            "The assistant can shape a request, but people review and submit it.",
          aiPoints: [
            "Grounded answers",
            "Editable suggestions",
            "Normal form always available",
          ],
          finalTitle: "Make the next request easier to handle.",
          finalDescription:
            "Start with the demo form and see the complete intake experience.",
          finalAction: "Try the request flow",
        }}
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Every request. One clear path forward.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "From first message to finished handoff",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Help when it is useful. Control where it matters.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Start a request" }),
    ).toHaveAttribute("href", "/en/request/opshub-demo-request-form");
    expect(
      screen.getByRole("link", { name: "Open team workspace" }),
    ).toHaveAttribute("href", "/en/staff");
    expect(
      screen.getByRole("link", { name: "Try the request flow" }),
    ).toHaveAttribute("href", "/en/request/opshub-demo-request-form");
  });
});
