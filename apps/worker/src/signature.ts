import { createHmac } from "node:crypto";

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type SignedWebhook = {
  body: string;
  headers: Record<string, string>;
};

type SignedWebhookInput = {
  eventId: string;
  idempotencyKey: string;
  payload: JsonValue;
  secret: string;
  timestampSeconds: number;
};

export function createSignedWebhook({
  eventId,
  idempotencyKey,
  payload,
  secret,
  timestampSeconds,
}: SignedWebhookInput): SignedWebhook {
  const body = JSON.stringify(payload);
  const timestamp = String(timestampSeconds);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");

  return {
    body,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-OpsHub-Event-Id": eventId,
      "X-OpsHub-Timestamp": timestamp,
      "X-OpsHub-Signature": `v1=${signature}`,
      "Idempotency-Key": idempotencyKey,
    },
  };
}
