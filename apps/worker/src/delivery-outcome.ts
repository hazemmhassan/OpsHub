import { z } from "zod";

export type DeliveryFailure = {
  retryable: boolean;
  httpStatus: number;
  code: string;
  message: string;
};

export type VerifiedSuccess = {
  eventId: string;
  requestReference: string;
  effect: "upserted";
};

const successResponseSchema = z
  .object({
    ok: z.literal(true),
    event_id: z.uuid(),
    request_reference: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{10}$/u),
    effect: z.literal("upserted"),
  })
  .strict();

export function calculateRetryDelaySeconds(
  attemptCount: number,
  random: () => number,
): number {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new Error("invalid_attempt_count");
  }

  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new Error("invalid_random_sample");
  }

  const ceiling = Math.min(1_800, 30 * 2 ** (attemptCount - 1));
  return Math.floor(sample * ceiling);
}

export function classifyHttpFailure(status: number): DeliveryFailure {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error("invalid_http_status");
  }

  const retryCode =
    status === 408
      ? "receiver_timeout"
      : status === 425
        ? "receiver_too_early"
        : status === 429
          ? "receiver_rate_limited"
          : status >= 500
            ? "receiver_unavailable"
            : null;

  if (retryCode) {
    return {
      retryable: true,
      httpStatus: status,
      code: retryCode,
      message: "The receiver is temporarily unavailable.",
    };
  }

  return {
    retryable: false,
    httpStatus: status,
    code:
      status >= 300 && status < 400 ? "receiver_redirect" : "receiver_rejected",
    message:
      status >= 300 && status < 400
        ? "The receiver attempted an unapproved redirect."
        : "The receiver rejected the delivery.",
  };
}

export function parseSuccessResponse(
  body: string,
  expectedEventId: string,
  expectedReference: string,
): VerifiedSuccess {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("invalid_receiver_response");
  }

  const result = successResponseSchema.safeParse(parsed);
  if (
    !result.success ||
    result.data.event_id !== expectedEventId ||
    result.data.request_reference !== expectedReference
  ) {
    throw new Error("invalid_receiver_response");
  }

  return {
    eventId: result.data.event_id,
    requestReference: result.data.request_reference,
    effect: result.data.effect,
  };
}
