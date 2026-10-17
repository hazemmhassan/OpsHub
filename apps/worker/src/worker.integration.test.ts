import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { processDelivery } from "./delivery-processor.js";
import { createMockReceiverServer } from "./mock-receiver-server.js";
import { InMemoryApprovedRequestStore } from "./mock-receiver-store.js";
import { sendWebhook } from "./webhook-client.js";
import { SupabaseDeliveryRepository } from "./supabase-repository.js";

const runIntegration = process.env.RUN_WORKER_INTEGRATION === "true";
const integration = runIntegration ? describe : describe.skip;

const requestId = "00000000-0000-4000-8000-000000006611";
const deliveryId = "00000000-0000-4000-8000-000000006621";
const endpointId = "00000000-0000-4000-8000-000000000021";
const orgId = "00000000-0000-4000-8000-000000000001";
const publicFormId = "00000000-0000-4000-8000-000000000011";
const signingSecret = "phase-six-integration-signing-secret-32";

integration("worker database and receiver integration", () => {
  it("claims, signs, sends, verifies, and records one approved request", async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error("integration_environment_missing");
    }

    const client = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const repository = new SupabaseDeliveryRepository(client);
    const store = new InMemoryApprovedRequestStore();
    const server = createMockReceiverServer({
      secret: signingSecret,
      store,
      nowSeconds: () =>
        Math.floor(new Date("2026-10-17T12:00:10.000Z").getTime() / 1_000),
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("integration_server_address_unavailable");
    }
    const origin = `http://127.0.0.1:${address.port}`;

    const cleanup = async () => {
      await client.from("audit_events").delete().eq("delivery_id", deliveryId);
      await client.from("integration_deliveries").delete().eq("id", deliveryId);
      await client
        .from("request_submission_snapshots")
        .delete()
        .eq("request_id", requestId);
      await client.from("requests").delete().eq("id", requestId);
      await client
        .from("webhook_endpoints")
        .update({
          url: "http://127.0.0.1:5678/webhook/opshub-approved-request",
          signing_secret_ref: "OPSHUB_WEBHOOK_SIGNING_SECRET",
        })
        .eq("id", endpointId);
    };

    try {
      await cleanup();

      const { error: endpointError } = await client
        .from("webhook_endpoints")
        .update({
          url: `${origin}/webhook/opshub`,
          signing_secret_ref: "OPSHUB_WEBHOOK_SIGNING_SECRET",
        })
        .eq("id", endpointId);
      if (endpointError) throw endpointError;

      const { error: requestError } = await client.from("requests").insert({
        id: requestId,
        org_id: orgId,
        public_form_id: publicFormId,
        reference: "6B00000001",
        idempotency_key: "00000000-0000-4000-8000-000000006601",
        status: "approved",
        review_started_at: "2026-10-17T11:59:00.000Z",
        decided_at: "2026-10-17T12:00:00.000Z",
      });
      if (requestError) throw requestError;

      const { error: snapshotError } = await client
        .from("request_submission_snapshots")
        .insert({
          request_id: requestId,
          org_id: orgId,
          requester_type: "individual",
          contact_name: "Synthetic Integration User",
          email: "worker-integration@example.test",
          phone_raw: "+201000000000",
          phone_e164: "+201000000000",
          country_code: "EG",
          service_category: "consulting",
          request_title: "Worker integration request",
          description:
            "Synthetic request used only for the local worker integration test.",
          preferred_contact_method: "email",
          submitted_locale: "en",
          consent_text_version: "consent-en-v1",
          consent_locale: "en",
          form_version: 1,
        });
      if (snapshotError) throw snapshotError;

      const { error: deliveryError } = await client
        .from("integration_deliveries")
        .insert({
          id: deliveryId,
          org_id: orgId,
          request_id: requestId,
          webhook_endpoint_id: endpointId,
          idempotency_key: `request.approved:${requestId}`,
          payload: {},
        });
      if (deliveryError) throw deliveryError;

      const claimed = await repository.claim(10, "integration-worker", 60);
      const delivery = claimed.find((value) => value.deliveryId === deliveryId);
      expect(delivery).toBeDefined();
      if (!delivery) throw new Error("integration_delivery_not_claimed");

      const outcome = await processDelivery(delivery, {
        recorder: repository,
        secrets: { OPSHUB_WEBHOOK_SIGNING_SECRET: signingSecret },
        endpointPolicy: {
          allowedOrigins: [origin],
          allowInsecureLocal: true,
        },
        now: () => new Date("2026-10-17T12:00:10.000Z"),
        random: () => 0.5,
        send: sendWebhook,
      });

      expect(outcome.kind).toBe("succeeded");
      const { data: storedDelivery, error: storedError } = await client
        .from("integration_deliveries")
        .select("status,attempt_count,last_http_status,succeeded_at,lock_token")
        .eq("id", deliveryId)
        .single();
      if (storedError) throw storedError;
      expect(storedDelivery).toMatchObject({
        status: "succeeded",
        attempt_count: 1,
        last_http_status: 200,
        lock_token: null,
      });
      expect(storedDelivery.succeeded_at).toEqual(expect.any(String));
      expect(store.list()).toHaveLength(1);
      expect(store.list()[0]).toMatchObject({
        reference: "6B00000001",
        email: "worker-integration@example.test",
      });
    } finally {
      await cleanup();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  });
});
