import { z } from "zod";

import {
  calculateRetryDelaySeconds,
  classifyHttpFailure,
  parseSuccessResponse,
} from "./delivery-outcome.js";
import { assertAllowedEndpoint } from "./endpoint-policy.js";
import { createSignedWebhook, type JsonValue } from "./signature.js";
import { WebhookTransportError } from "./webhook-client.js";

const requestPayloadSchema = z
  .object({
    reference: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{10}$/u),
    submitted_at: z.iso.datetime({ offset: true }),
    approved_at: z.iso.datetime({ offset: true }),
    submitted_locale: z.enum(["ar", "en"]),
    requester_type: z.enum(["individual", "company"]),
    contact_name: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    phone_e164: z.string().regex(/^\+[1-9][0-9]{1,14}$/u),
    country_code: z.string().regex(/^[A-Z]{2}$/u),
    preferred_contact_method: z.enum(["email", "phone"]).nullable(),
    company_name: z.string().trim().min(1).max(160).nullable(),
    job_title: z.string().trim().min(1).max(120).nullable(),
    company_website: z.url().nullable(),
    service_category: z.enum([
      "consulting",
      "it_software",
      "marketing",
      "training",
      "support_maintenance",
      "other",
    ]),
    request_title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(20).max(2_000),
    desired_start_date: z.iso.date().nullable(),
  })
  .strict();

const deliveryPayloadSchema = z
  .object({
    event_id: z.uuid(),
    event_type: z.literal("request.approved"),
    event_version: z.literal(1),
    occurred_at: z.iso.datetime({ offset: true }),
    request: requestPayloadSchema,
  })
  .strict();

export type ClaimedDelivery = {
  deliveryId: string;
  orgId: string;
  requestId: string;
  eventType: string;
  eventVersion: number;
  idempotencyKey: string;
  payload: JsonValue;
  attemptCount: number;
  lockToken: string;
  lockedUntil: string;
  endpointUrl: string;
  signingSecretRef: string;
};

export type DeliverySuccessRecord = {
  deliveryId: string;
  lockToken: string;
  httpStatus: number;
  receiverEventId: string;
  receiverRequestReference: string;
  receiverEffect: "upserted";
};

export type DeliveryFailureRecord = {
  deliveryId: string;
  lockToken: string;
  retryable: boolean;
  httpStatus: number | null;
  errorCode: string;
  errorMessage: string;
  retryDelaySeconds: number | null;
};

export interface DeliveryResultRecorder {
  recordSuccess(value: DeliverySuccessRecord): Promise<void>;
  recordFailure(value: DeliveryFailureRecord): Promise<void>;
}

type ProcessDependencies = {
  recorder: DeliveryResultRecorder;
  secrets: Record<string, string | undefined>;
  endpointPolicy: {
    allowedOrigins: string[];
    allowInsecureLocal: boolean;
  };
  now: () => Date;
  random: () => number;
  send: (input: {
    url: string;
    body: string;
    headers: Record<string, string>;
    timeoutMs: number;
  }) => Promise<{ status: number; body: string }>;
};

export async function processDelivery(
  delivery: ClaimedDelivery,
  dependencies: ProcessDependencies,
): Promise<{ kind: "succeeded" | "failed"; deliveryId: string }> {
  const recordFailure = async (
    failure: Omit<DeliveryFailureRecord, "deliveryId" | "lockToken">,
  ) => {
    await dependencies.recorder.recordFailure({
      deliveryId: delivery.deliveryId,
      lockToken: delivery.lockToken,
      ...failure,
    });
    return { kind: "failed" as const, deliveryId: delivery.deliveryId };
  };

  const payloadResult = deliveryPayloadSchema.safeParse(delivery.payload);
  if (
    !payloadResult.success ||
    payloadResult.data.event_id !== delivery.deliveryId ||
    delivery.eventType !== "request.approved" ||
    delivery.eventVersion !== 1
  ) {
    return recordFailure({
      retryable: false,
      httpStatus: null,
      errorCode: "invalid_delivery_payload",
      errorMessage:
        "The stored delivery payload does not match the V1 contract.",
      retryDelaySeconds: null,
    });
  }

  const secret = dependencies.secrets[delivery.signingSecretRef];
  if (!secret || secret.length < 32) {
    return recordFailure({
      retryable: false,
      httpStatus: null,
      errorCode: "signing_secret_missing",
      errorMessage: "The configured signing secret is unavailable.",
      retryDelaySeconds: null,
    });
  }

  let endpoint: URL;
  try {
    endpoint = assertAllowedEndpoint(
      delivery.endpointUrl,
      dependencies.endpointPolicy,
    );
  } catch {
    return recordFailure({
      retryable: false,
      httpStatus: null,
      errorCode: "invalid_destination",
      errorMessage: "The configured receiver destination is not allowed.",
      retryDelaySeconds: null,
    });
  }

  const signed = createSignedWebhook({
    eventId: delivery.deliveryId,
    idempotencyKey: delivery.idempotencyKey,
    payload: payloadResult.data as JsonValue,
    secret,
    timestampSeconds: Math.floor(dependencies.now().getTime() / 1_000),
  });

  let response: { status: number; body: string };
  try {
    response = await dependencies.send({
      url: endpoint.href,
      body: signed.body,
      headers: signed.headers,
      timeoutMs: 15_000,
    });
  } catch (error) {
    const failure =
      error instanceof WebhookTransportError
        ? error
        : new WebhookTransportError(
            "network_error",
            true,
            "The receiver could not be reached.",
            { cause: error },
          );

    return recordFailure({
      retryable: failure.retryable,
      httpStatus: null,
      errorCode: failure.code,
      errorMessage: failure.message,
      retryDelaySeconds: failure.retryable
        ? calculateRetryDelaySeconds(delivery.attemptCount, dependencies.random)
        : null,
    });
  }

  if (response.status >= 200 && response.status < 300) {
    try {
      const verified = parseSuccessResponse(
        response.body,
        delivery.deliveryId,
        payloadResult.data.request.reference,
      );

      await dependencies.recorder.recordSuccess({
        deliveryId: delivery.deliveryId,
        lockToken: delivery.lockToken,
        httpStatus: response.status,
        receiverEventId: verified.eventId,
        receiverRequestReference: verified.requestReference,
        receiverEffect: verified.effect,
      });

      return { kind: "succeeded", deliveryId: delivery.deliveryId };
    } catch {
      return recordFailure({
        retryable: false,
        httpStatus: response.status,
        errorCode: "invalid_receiver_response",
        errorMessage: "The receiver returned an invalid success response.",
        retryDelaySeconds: null,
      });
    }
  }

  const failure = classifyHttpFailure(response.status);
  return recordFailure({
    retryable: failure.retryable,
    httpStatus: failure.httpStatus,
    errorCode: failure.code,
    errorMessage: failure.message,
    retryDelaySeconds: failure.retryable
      ? calculateRetryDelaySeconds(delivery.attemptCount, dependencies.random)
      : null,
  });
}
