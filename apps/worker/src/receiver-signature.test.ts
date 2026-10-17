import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifySignedWebhook } from "./receiver-signature.js";

const secret = "opshub-test-signing-secret-with-32-chars";
const timestampSeconds = 1_797_500_000;
const eventId = "11111111-1111-4111-8111-111111111111";

const payload = {
  event_id: eventId,
  event_type: "request.approved",
  event_version: 1,
  occurred_at: "2026-12-18T10:00:00.000Z",
  request: {
    reference: "7K3M9Q2R8D",
    submitted_at: "2026-12-18T09:00:00.000Z",
    approved_at: "2026-12-18T10:00:00.000Z",
    submitted_locale: "ar",
    requester_type: "company",
    contact_name: "Synthetic Demo User",
    email: "demo@example.test",
    phone_e164: "+201000000000",
    country_code: "EG",
    preferred_contact_method: "email",
    company_name: "Synthetic Demo Company",
    job_title: "Operations Manager",
    company_website: "https://example.test",
    service_category: "it_software",
    request_title: "Synthetic service request",
    description: "Synthetic portfolio demonstration data only.",
    desired_start_date: "2026-12-20",
  },
};

function signedInput(overrides: Record<string, string> = {}) {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${body}`, "utf8")
    .digest("hex");

  return {
    body: Buffer.from(body, "utf8"),
    headers: {
      "content-type": "application/json; charset=utf-8",
      "idempotency-key":
        "request.approved:00000000-0000-4000-8000-000000000001",
      "x-opshub-event-id": eventId,
      "x-opshub-signature": `v1=${signature}`,
      "x-opshub-timestamp": String(timestampSeconds),
      ...overrides,
    },
    nowSeconds: timestampSeconds + 60,
    secret,
  };
}

describe("verifySignedWebhook", () => {
  it("returns a validated V1 event only after the exact raw bytes authenticate", () => {
    const result = verifySignedWebhook(signedInput());

    expect(result).toEqual(payload);
  });

  it("rejects a body changed after signing", () => {
    const input = signedInput();
    input.body = Buffer.from(
      input.body
        .toString("utf8")
        .replace("Synthetic Demo User", "Changed User"),
      "utf8",
    );

    expect(() => verifySignedWebhook(input)).toThrowError("invalid_signature");
  });

  it("rejects a stale timestamp before accepting the event", () => {
    const input = signedInput();
    input.nowSeconds = timestampSeconds + 301;

    expect(() => verifySignedWebhook(input)).toThrowError("stale_timestamp");
  });

  it("rejects a header event ID that differs from the signed body", () => {
    const input = signedInput({
      "x-opshub-event-id": "22222222-2222-4222-8222-222222222222",
    });

    expect(() => verifySignedWebhook(input)).toThrowError("event_id_mismatch");
  });
});
