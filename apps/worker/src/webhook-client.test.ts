import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { classifyTransportError, sendWebhook } from "./webhook-client.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        }),
    ),
  );
});

async function listen(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<{ server: Server; origin: string }> {
  const server = createServer(handler);
  servers.push(server);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test_server_address_unavailable");
  }

  return { server, origin: `http://127.0.0.1:${address.port}` };
}

describe("sendWebhook", () => {
  it("sends the exact body and headers and returns the raw receiver response", async () => {
    const received: { body?: string; signature?: string } = {};
    const { origin } = await listen((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        received.body = Buffer.concat(chunks).toString("utf8");
        const signature = request.headers["x-opshub-signature"];
        received.signature = Array.isArray(signature)
          ? signature[0]
          : signature;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end('{"ok":true}');
      });
    });

    const result = await sendWebhook({
      url: `${origin}/webhook/opshub`,
      body: '{"event_id":"event-1"}',
      headers: { "X-OpsHub-Signature": "v1=signature" },
      timeoutMs: 1_000,
    });

    expect(result).toEqual({ status: 200, body: '{"ok":true}' });
    expect(received).toEqual({
      body: '{"event_id":"event-1"}',
      signature: "v1=signature",
    });
  });

  it("does not follow receiver redirects to an unapproved destination", async () => {
    let redirectedTargetCalls = 0;
    const { origin } = await listen((request, response) => {
      if (request.url === "/target") {
        redirectedTargetCalls += 1;
        response.end("unexpected");
        return;
      }

      response.writeHead(302, { Location: "/target" });
      response.end();
    });

    const result = await sendWebhook({
      url: `${origin}/redirect`,
      body: "{}",
      headers: {},
      timeoutMs: 1_000,
    });

    expect(result.status).toBe(302);
    expect(redirectedTargetCalls).toBe(0);
  });

  it("aborts a receiver that exceeds the configured timeout", async () => {
    const { origin } = await listen((_request, _response) => {});

    await expect(
      sendWebhook({
        url: `${origin}/slow`,
        body: "{}",
        headers: {},
        timeoutMs: 20,
      }),
    ).rejects.toMatchObject({
      code: "request_timeout",
      retryable: true,
    });
  });

  it("rejects an oversized response instead of buffering it without a bound", async () => {
    const { origin } = await listen((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("x".repeat(65_537));
    });

    await expect(
      sendWebhook({
        url: `${origin}/oversized`,
        body: "{}",
        headers: {},
        timeoutMs: 1_000,
      }),
    ).rejects.toMatchObject({
      code: "response_too_large",
      retryable: false,
    });
  });
});

describe("classifyTransportError", () => {
  it("does not retry a TLS certificate failure that repetition cannot repair", () => {
    const failure = classifyTransportError(
      new TypeError("fetch failed", {
        cause: { code: "CERT_HAS_EXPIRED" },
      }),
    );

    expect(failure).toMatchObject({
      code: "tls_validation_failed",
      retryable: false,
    });
  });

  it("keeps a connection reset retryable", () => {
    const failure = classifyTransportError(
      new TypeError("fetch failed", { cause: { code: "ECONNRESET" } }),
    );

    expect(failure).toMatchObject({ code: "network_error", retryable: true });
  });
});
