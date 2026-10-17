import { describe, expect, it } from "vitest";

import { parseClaimedDeliveries } from "./supabase-repository.js";

const rawClaim = {
  delivery_id: "00000000-0000-4000-8000-000000000821",
  org_id: "00000000-0000-4000-8000-000000000001",
  request_id: "00000000-0000-4000-8000-000000000811",
  event_type: "request.approved",
  event_version: 1,
  idempotency_key: "request.approved:00000000-0000-4000-8000-000000000811",
  payload: {
    event_id: "00000000-0000-4000-8000-000000000821",
    request: { reference: "6A00000001" },
  },
  attempt_count: 1,
  lock_token: "00000000-0000-4000-8000-000000009921",
  locked_until: "2026-10-17T12:01:00.000Z",
  endpoint_url: "https://automation.example.test/webhook/opshub",
  signing_secret_ref: "OPSHUB_PHASE_6_SIGNING_SECRET",
};

describe("parseClaimedDeliveries", () => {
  it("maps the database RPC shape into the worker delivery contract", () => {
    expect(parseClaimedDeliveries([rawClaim])).toEqual([
      {
        deliveryId: rawClaim.delivery_id,
        orgId: rawClaim.org_id,
        requestId: rawClaim.request_id,
        eventType: rawClaim.event_type,
        eventVersion: 1,
        idempotencyKey: rawClaim.idempotency_key,
        payload: rawClaim.payload,
        attemptCount: 1,
        lockToken: rawClaim.lock_token,
        lockedUntil: rawClaim.locked_until,
        endpointUrl: rawClaim.endpoint_url,
        signingSecretRef: rawClaim.signing_secret_ref,
      },
    ]);
  });

  it.each([
    [{ ...rawClaim, lock_token: null }, "missing fencing token"],
    [{ ...rawClaim, attempt_count: 0 }, "unconsumed attempt"],
    [
      { ...rawClaim, signing_secret_ref: "not a valid env name" },
      "unsafe secret reference",
    ],
  ])(
    "rejects %s instead of processing an unsafe RPC result",
    (value, _label) => {
      expect(() => parseClaimedDeliveries([value])).toThrow(
        "invalid_claim_result",
      );
    },
  );
});
