import { describe, expect, it } from "vitest";

import { aiTurnInputSchema, aiTurnResponseSchema } from "./contracts";

describe("AI intake contracts", () => {
  it("rejects contact values and workflow decisions from the model boundary", () => {
    const input = aiTurnInputSchema.safeParse({
      sessionId: "session_contract_1",
      turnNumber: 1,
      latestMessage: "Help us organize support requests.",
      draft: { email: "private@example.test" },
      completedFields: ["email"],
    });
    const output = aiTurnResponseSchema.safeParse({
      schema_version: "ai-intake-turn-v1",
      status: "review_ready",
      assistant_message: "Ready",
      draft_patch: { approval_status: "approved" },
      citations: [],
    });

    expect(input.success).toBe(false);
    expect(output.success).toBe(false);
  });

  it("accepts the strict model-safe turn contract", () => {
    const input = aiTurnInputSchema.parse({
      sessionId: "session_contract_1",
      turnNumber: 2,
      latestMessage: "We need an internal workflow tool.",
      draft: {
        requester_type: "company",
        service_category: "it_software",
        request_title: "Internal workflow tool",
        description: null,
        company_name: "Example Co",
        job_title: null,
        company_website: null,
      },
      completedFields: ["contact_name", "email", "phone", "country"],
    });

    expect(input.turnNumber).toBe(2);
    expect(input.draft).not.toHaveProperty("email");
  });
});
