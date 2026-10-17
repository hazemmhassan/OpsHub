import { describe, expect, it } from "vitest";

import {
  calculateRetryDelaySeconds,
  classifyHttpFailure,
  parseSuccessResponse,
} from "./delivery-outcome.js";

describe("calculateRetryDelaySeconds", () => {
  it("uses full jitter within the exponential ceiling", () => {
    expect(calculateRetryDelaySeconds(1, () => 0.5)).toBe(15);
    expect(calculateRetryDelaySeconds(2, () => 0.5)).toBe(30);
    expect(calculateRetryDelaySeconds(10, () => 0.5)).toBe(900);
  });

  it("never returns the exclusive upper boundary", () => {
    expect(calculateRetryDelaySeconds(1, () => 0.999_999)).toBe(29);
  });
});

describe("classifyHttpFailure", () => {
  it.each([
    [408, true, "receiver_timeout"],
    [425, true, "receiver_too_early"],
    [429, true, "receiver_rate_limited"],
    [503, true, "receiver_unavailable"],
    [400, false, "receiver_rejected"],
    [401, false, "receiver_rejected"],
    [403, false, "receiver_rejected"],
    [404, false, "receiver_rejected"],
    [422, false, "receiver_rejected"],
  ])(
    "classifies HTTP %i without retrying permanent failures",
    (status, retryable, code) => {
      expect(classifyHttpFailure(status)).toEqual({
        retryable,
        httpStatus: status,
        code,
        message: retryable
          ? "The receiver is temporarily unavailable."
          : "The receiver rejected the delivery.",
      });
    },
  );
});

describe("parseSuccessResponse", () => {
  it("accepts only a matching verified V1 response", () => {
    expect(
      parseSuccessResponse(
        JSON.stringify({
          ok: true,
          event_id: "00000000-0000-4000-8000-000000000821",
          request_reference: "6A00000001",
          effect: "upserted",
        }),
        "00000000-0000-4000-8000-000000000821",
        "6A00000001",
      ),
    ).toEqual({
      eventId: "00000000-0000-4000-8000-000000000821",
      requestReference: "6A00000001",
      effect: "upserted",
    });
  });

  it.each([
    ["not-json", "malformed JSON"],
    [
      JSON.stringify({
        ok: true,
        event_id: "00000000-0000-4000-8000-000000000999",
        request_reference: "6A00000001",
        effect: "upserted",
      }),
      "mismatched event ID",
    ],
    [
      JSON.stringify({
        ok: true,
        event_id: "00000000-0000-4000-8000-000000000821",
        request_reference: "WRONGREF01",
        effect: "upserted",
      }),
      "mismatched request reference",
    ],
  ])("rejects %s instead of recording a false success", (body) => {
    expect(() =>
      parseSuccessResponse(
        body,
        "00000000-0000-4000-8000-000000000821",
        "6A00000001",
      ),
    ).toThrow("invalid_receiver_response");
  });
});
