import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  ClaimedDelivery,
  DeliveryFailureRecord,
  DeliveryResultRecorder,
  DeliverySuccessRecord,
} from "./delivery-processor.js";
import type { JsonValue } from "./signature.js";

const claimedDeliverySchema = z
  .object({
    delivery_id: z.uuid(),
    org_id: z.uuid(),
    request_id: z.uuid(),
    event_type: z.literal("request.approved"),
    event_version: z.literal(1),
    idempotency_key: z.string().trim().min(1).max(200),
    payload: z.json(),
    attempt_count: z.number().int().min(1),
    lock_token: z.uuid(),
    locked_until: z.iso.datetime({ offset: true }),
    endpoint_url: z.url(),
    signing_secret_ref: z.string().regex(/^[A-Z][A-Z0-9_]{0,119}$/u),
  })
  .strict();

export class DeliveryRepositoryError extends Error {
  constructor(operation: string, options?: ErrorOptions) {
    super(`delivery_repository_${operation}_failed`, options);
    this.name = "DeliveryRepositoryError";
  }
}

export function parseClaimedDeliveries(value: unknown): ClaimedDelivery[] {
  const result = z.array(claimedDeliverySchema).safeParse(value);
  if (!result.success) {
    throw new Error("invalid_claim_result");
  }

  return result.data.map((delivery) => ({
    deliveryId: delivery.delivery_id,
    orgId: delivery.org_id,
    requestId: delivery.request_id,
    eventType: delivery.event_type,
    eventVersion: delivery.event_version,
    idempotencyKey: delivery.idempotency_key,
    payload: delivery.payload as JsonValue,
    attemptCount: delivery.attempt_count,
    lockToken: delivery.lock_token,
    lockedUntil: delivery.locked_until,
    endpointUrl: delivery.endpoint_url,
    signingSecretRef: delivery.signing_secret_ref,
  }));
}

export class SupabaseDeliveryRepository implements DeliveryResultRecorder {
  constructor(private readonly client: SupabaseClient) {}

  async claim(
    batchSize: number,
    workerId: string,
    leaseSeconds: number,
  ): Promise<ClaimedDelivery[]> {
    const { data, error } = await this.client.rpc(
      "claim_integration_deliveries",
      {
        p_batch_size: batchSize,
        p_worker_id: workerId,
        p_lease_seconds: leaseSeconds,
      },
    );

    if (error) {
      throw new DeliveryRepositoryError("claim", { cause: error });
    }

    try {
      return parseClaimedDeliveries(data);
    } catch (error) {
      throw new DeliveryRepositoryError("claim_contract", { cause: error });
    }
  }

  async recordSuccess(value: DeliverySuccessRecord): Promise<void> {
    const { error } = await this.client.rpc("record_delivery_success", {
      p_delivery_id: value.deliveryId,
      p_lock_token: value.lockToken,
      p_http_status: value.httpStatus,
      p_receiver_event_id: value.receiverEventId,
      p_receiver_request_reference: value.receiverRequestReference,
      p_receiver_effect: value.receiverEffect,
    });

    if (error) {
      throw new DeliveryRepositoryError("record_success", { cause: error });
    }
  }

  async recordFailure(value: DeliveryFailureRecord): Promise<void> {
    const { error } = await this.client.rpc("record_delivery_failure", {
      p_delivery_id: value.deliveryId,
      p_lock_token: value.lockToken,
      p_retryable: value.retryable,
      p_http_status: value.httpStatus,
      p_error_code: value.errorCode,
      p_error_message: value.errorMessage,
      p_retry_delay_seconds: value.retryDelaySeconds,
    });

    if (error) {
      throw new DeliveryRepositoryError("record_failure", { cause: error });
    }
  }
}
