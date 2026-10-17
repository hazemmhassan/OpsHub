import { once } from "node:events";

import { afterEach, describe, expect, it } from "vitest";

import { createMockReceiverServer } from "./mock-receiver-server.js";
import { InMemoryApprovedRequestStore } from "./mock-receiver-store.js";
import { createSignedWebhook } from "./signature.js";

const secret = "opshub-test-signing-secret-with-32-chars";
const nowSeconds = 1_797_500_000;
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
    submitted_locale: "en",
    requester_type: "individual",
    contact_name: "Synthetic Demo User",
    email: "demo@example.test",
    phone_e164: "+201000000000",
    country_code: "EG",
    preferred_contact_method: "email",
    company_name: null,
    job_title: null,
    company_website: null,
    service_category: "consulting",
    request_title: "Synthetic service request",
    description: "Synthetic portfolio demonstration data only.",
    desired_start_date: null,
  },
};

const servers: ReturnType<typeof createMockReceiverServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(async (server) => {
      server.close();
      await once(server, "close");
    }),
  );
});

async function startServer() {
  const store = new InMemoryApprovedRequestStore();
  const server = createMockReceiverServer({
    secret,
    store,
    nowSeconds: () => nowSeconds,
  });
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("missing_address");
  return { baseUrl: `http://127.0.0.1:${address.port}`, store };
}

describe("local mock receiver HTTP boundary", () => {
  it("returns the verified success contract and exposes one idempotent row", async () => {
    const { baseUrl } = await startServer();
    const signed = createSignedWebhook({
      eventId,
      idempotencyKey: "request.approved:00000000-0000-4000-8000-000000000001",
      payload,
      secret,
      timestampSeconds: nowSeconds,
    });

    const first = await fetch(`${baseUrl}/webhook/opshub`, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
    });
    const second = await fetch(`${baseUrl}/webhook/opshub`, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
    });
    const rows = await fetch(`${baseUrl}/rows`);

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      ok: true,
      event_id: eventId,
      request_reference: "7K3M9Q2R8D",
      effect: "upserted",
    });
    expect(second.status).toBe(200);
    expect(await rows.json()).toEqual({ rows: [payload.request] });
  });

  it("rejects an invalid signature without applying a row", async () => {
    const { baseUrl, store } = await startServer();
    const signed = createSignedWebhook({
      eventId,
      idempotencyKey: "request.approved:00000000-0000-4000-8000-000000000001",
      payload,
      secret,
      timestampSeconds: nowSeconds,
    });
    signed.headers["X-OpsHub-Signature"] = `v1=${"0".repeat(64)}`;

    const response = await fetch(`${baseUrl}/webhook/opshub`, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "invalid_signature",
    });
    expect(store.list()).toEqual([]);
  });
});
