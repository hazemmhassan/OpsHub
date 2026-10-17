import { describe, expect, it } from "vitest";

import {
  processDelivery,
  type ClaimedDelivery,
  type DeliveryFailureRecord,
  type DeliveryResultRecorder,
  type DeliverySuccessRecord,
} from "./delivery-processor.js";
import type { JsonValue } from "./signature.js";

const delivery: ClaimedDelivery = {
  deliveryId: "00000000-0000-4000-8000-000000000821",
  orgId: "00000000-0000-4000-8000-000000000001",
  requestId: "00000000-0000-4000-8000-000000000811",
  eventType: "request.approved",
  eventVersion: 1,
  idempotencyKey: "request.approved:00000000-0000-4000-8000-000000000811",
  payload: {
    event_id: "00000000-0000-4000-8000-000000000821",
    event_type: "request.approved",
    event_version: 1,
    occurred_at: "2026-10-17T12:00:00.000Z",
    request: {
      reference: "6A00000001",
      submitted_at: "2026-10-17T11:30:00.000Z",
      approved_at: "2026-10-17T12:00:00.000Z",
      submitted_locale: "en",
      requester_type: "individual",
      contact_name: "Synthetic User",
      email: "synthetic@example.test",
      phone_e164: "+201000000000",
      country_code: "EG",
      preferred_contact_method: "email",
      company_name: null,
      job_title: null,
      company_website: null,
      service_category: "consulting",
      request_title: "Synthetic request",
      description: "Synthetic Phase 6 delivery request for testing.",
      desired_start_date: null,
    },
  },
  attemptCount: 2,
  lockToken: "00000000-0000-4000-8000-000000009921",
  lockedUntil: "2026-10-17T12:01:00.000Z",
  endpointUrl: "https://automation.example.test/webhook/opshub",
  signingSecretRef: "OPSHUB_PHASE_6_SIGNING_SECRET",
};

class MemoryRecorder implements DeliveryResultRecorder {
  outcome?:
    | { kind: "success"; value: DeliverySuccessRecord }
    | { kind: "failure"; value: DeliveryFailureRecord };

  async recordSuccess(value: DeliverySuccessRecord): Promise<void> {
    this.outcome = { kind: "success", value };
  }

  async recordFailure(value: DeliveryFailureRecord): Promise<void> {
    this.outcome = { kind: "failure", value };
  }
}

const baseDependencies = {
  secrets: {
    OPSHUB_PHASE_6_SIGNING_SECRET: "phase-six-test-secret-with-32-chars",
  },
  endpointPolicy: {
    allowedOrigins: ["https://automation.example.test"],
    allowInsecureLocal: false,
  },
  now: () => new Date("2026-10-17T12:00:10.500Z"),
  random: () => 0.5,
};

describe("processDelivery", () => {
  it("records success only after a matching verified receiver response", async () => {
    const recorder = new MemoryRecorder();

    const outcome = await processDelivery(delivery, {
      ...baseDependencies,
      recorder,
      send: async () => ({
        status: 200,
        body: JSON.stringify({
          ok: true,
          event_id: delivery.deliveryId,
          request_reference: "6A00000001",
          effect: "upserted",
        }),
      }),
    });

    expect(outcome).toEqual({
      kind: "succeeded",
      deliveryId: delivery.deliveryId,
    });
    expect(recorder.outcome).toEqual({
      kind: "success",
      value: {
        deliveryId: delivery.deliveryId,
        lockToken: delivery.lockToken,
        httpStatus: 200,
        receiverEventId: delivery.deliveryId,
        receiverRequestReference: "6A00000001",
        receiverEffect: "upserted",
      },
    });
  });

  it("schedules a jittered retry for a temporary receiver failure", async () => {
    const recorder = new MemoryRecorder();

    await processDelivery(delivery, {
      ...baseDependencies,
      recorder,
      send: async () => ({ status: 503, body: "temporarily unavailable" }),
    });

    expect(recorder.outcome).toEqual({
      kind: "failure",
      value: {
        deliveryId: delivery.deliveryId,
        lockToken: delivery.lockToken,
        retryable: true,
        httpStatus: 503,
        errorCode: "receiver_unavailable",
        errorMessage: "The receiver is temporarily unavailable.",
        retryDelaySeconds: 30,
      },
    });
  });

  it("records a mismatched 2xx response as a permanent contract failure", async () => {
    const recorder = new MemoryRecorder();

    await processDelivery(delivery, {
      ...baseDependencies,
      recorder,
      send: async () => ({ status: 200, body: '{"ok":true}' }),
    });

    expect(recorder.outcome).toEqual({
      kind: "failure",
      value: {
        deliveryId: delivery.deliveryId,
        lockToken: delivery.lockToken,
        retryable: false,
        httpStatus: 200,
        errorCode: "invalid_receiver_response",
        errorMessage: "The receiver returned an invalid success response.",
        retryDelaySeconds: null,
      },
    });
  });

  it("does not send requester data when the signing secret is missing", async () => {
    const recorder = new MemoryRecorder();
    let sendCalls = 0;

    await processDelivery(delivery, {
      ...baseDependencies,
      secrets: {},
      recorder,
      send: async () => {
        sendCalls += 1;
        return { status: 200, body: "{}" };
      },
    });

    expect(sendCalls).toBe(0);
    expect(recorder.outcome).toMatchObject({
      kind: "failure",
      value: {
        retryable: false,
        httpStatus: null,
        errorCode: "signing_secret_missing",
        retryDelaySeconds: null,
      },
    });
  });

  it("does not send a malformed or mismatched immutable payload", async () => {
    const recorder = new MemoryRecorder();
    let sendCalls = 0;

    await processDelivery(
      {
        ...delivery,
        payload: {
          ...(delivery.payload as Record<string, JsonValue>),
          event_id: crypto.randomUUID(),
        },
      },
      {
        ...baseDependencies,
        recorder,
        send: async () => {
          sendCalls += 1;
          return { status: 200, body: "{}" };
        },
      },
    );

    expect(sendCalls).toBe(0);
    expect(recorder.outcome).toMatchObject({
      kind: "failure",
      value: {
        retryable: false,
        errorCode: "invalid_delivery_payload",
      },
    });
  });
});
