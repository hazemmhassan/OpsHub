import { createHmac, timingSafeEqual } from "node:crypto";

import { approvedRequestEventSchema } from "./delivery-event.js";

type HeaderValue = string | string[] | undefined;

type VerifySignedWebhookInput = {
  body: Buffer;
  headers: Record<string, HeaderValue>;
  secret: string;
  nowSeconds: number;
  toleranceSeconds?: number;
};

function readHeader(
  headers: Record<string, HeaderValue>,
  expectedName: string,
): string {
  const matchingEntry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === expectedName,
  );
  const value = matchingEntry?.[1];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error("missing_signature_header");
  }

  return value;
}

export function verifySignedWebhook({
  body,
  headers,
  secret,
  nowSeconds,
  toleranceSeconds = 300,
}: VerifySignedWebhookInput) {
  const eventId = readHeader(headers, "x-opshub-event-id");
  const timestampText = readHeader(headers, "x-opshub-timestamp");
  const suppliedSignature = readHeader(headers, "x-opshub-signature");
  readHeader(headers, "idempotency-key");

  if (!/^\d+$/u.test(timestampText)) {
    throw new Error("invalid_timestamp");
  }

  const timestampSeconds = Number(timestampText);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds
  ) {
    throw new Error("stale_timestamp");
  }

  if (!/^v1=[0-9a-f]{64}$/u.test(suppliedSignature)) {
    throw new Error("invalid_signature");
  }

  const expectedSignature = `v1=${createHmac("sha256", secret)
    .update(timestampText, "utf8")
    .update(".", "utf8")
    .update(body)
    .digest("hex")}`;
  const suppliedBytes = Buffer.from(suppliedSignature, "utf8");
  const expectedBytes = Buffer.from(expectedSignature, "utf8");

  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    throw new Error("invalid_signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("invalid_json");
  }

  const event = approvedRequestEventSchema.safeParse(parsed);
  if (!event.success) {
    throw new Error("invalid_event");
  }

  if (event.data.event_id !== eventId) {
    throw new Error("event_id_mismatch");
  }

  return event.data;
}
