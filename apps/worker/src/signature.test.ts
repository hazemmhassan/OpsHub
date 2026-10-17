import { describe, expect, it } from "vitest";

import { createSignedWebhook } from "./signature.js";

describe("createSignedWebhook", () => {
  it("signs the exact serialized body using the V1 timestamp contract", () => {
    const signed = createSignedWebhook({
      eventId: "00000000-0000-4000-8000-000000000821",
      idempotencyKey: "request.approved:phase-six",
      payload: {
        event_id: "00000000-0000-4000-8000-000000000821",
        event_type: "request.approved",
        event_version: 1,
        request: { reference: "6A00000001" },
      },
      secret: "phase-six-test-secret-with-32-chars",
      timestampSeconds: 1760702400,
    });

    expect(signed.body).toBe(
      '{"event_id":"00000000-0000-4000-8000-000000000821","event_type":"request.approved","event_version":1,"request":{"reference":"6A00000001"}}',
    );
    expect(signed.headers).toEqual({
      "Content-Type": "application/json; charset=utf-8",
      "Idempotency-Key": "request.approved:phase-six",
      "X-OpsHub-Event-Id": "00000000-0000-4000-8000-000000000821",
      "X-OpsHub-Signature":
        "v1=ea7a5f519b177e9fd1927459e5f2dccfe82900e0542687ee2ce4f36ffcdb4abc",
      "X-OpsHub-Timestamp": "1760702400",
    });
  });
});
