import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AiEnvironment } from "./environment";
import { createAiFallback, requestAiTurn } from "./server-client";

const input = {
  sessionId: "session_boundary_1",
  turnNumber: 1,
  latestMessage: "We need workflow automation.",
  draft: {
    requester_type: "company" as const,
    service_category: null,
    request_title: null,
    description: null,
    company_name: null,
    job_title: null,
    company_website: null,
  },
  completedFields: ["email" as const, "phone" as const],
};

describe("requestAiTurn", () => {
  it("explains the rate limit while preserving the fixed-form path", () => {
    const result = createAiFallback("en", "rate_limited");

    expect(result.status).toBe("fallback");
    expect(result.handoff_reason).toBe("rate_limited");
    expect(result.assistant_message).toMatch(/limit/i);
  });
  it("returns a localized fallback without a network call when disabled", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const environment: AiEnvironment = {
      AI_INTAKE_ENABLED: false,
      AI_SERVICE_URL: "http://127.0.0.1:8001",
    };

    const result = await requestAiTurn(input, "ar", environment, fetcher);

    expect(result.status).toBe("fallback");
    expect(result.handoff_reason).toBe("ai_disabled");
    expect(result.assistant_message).toMatch(/النموذج العادي/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the internal key server-side and sends the strict service shape", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          schema_version: "ai-intake-turn-v1",
          status: "collecting",
          assistant_message: "What outcome do you need?",
          draft_patch: {},
          next_field: "description",
          citations: [],
          handoff_reason: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const environment: AiEnvironment = {
      AI_INTAKE_ENABLED: true,
      AI_SERVICE_URL: "http://127.0.0.1:8001",
      AI_INTERNAL_KEY: "test-internal-key-with-32-characters",
    };

    const result = await requestAiTurn(input, "en", environment, fetcher);

    expect(result.status).toBe("collecting");
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8001/v1/intake/turn");
    expect(options?.headers).toEqual({
      "Content-Type": "application/json",
      "X-OpsHub-AI-Key": "test-internal-key-with-32-characters",
    });
    const body = String(options?.body);
    expect(body).toContain('"turn_number":1');
    expect(body).toContain('"completed_fields":["email","phone"]');
    expect(body).not.toContain("private@example.test");
  });

  it("falls back when the service returns an invalid response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const environment: AiEnvironment = {
      AI_INTAKE_ENABLED: true,
      AI_SERVICE_URL: "http://127.0.0.1:8001",
      AI_INTERNAL_KEY: "test-internal-key-with-32-characters",
    };

    const result = await requestAiTurn(input, "en", environment, fetcher);

    expect(result.status).toBe("fallback");
    expect(result.handoff_reason).toBe("provider_invalid_output");
  });
});
