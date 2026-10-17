import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import {
  InMemoryApprovedRequestStore,
  mapApprovedRequestToRow,
} from "./mock-receiver-store.js";
import { verifySignedWebhook } from "./receiver-signature.js";

const maximumRequestBytes = 65_536;

type MockReceiverOptions = {
  secret: string;
  store: InMemoryApprovedRequestStore;
  nowSeconds?: () => number;
};

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.length;
    if (totalBytes > maximumRequestBytes) {
      throw new Error("request_too_large");
    }
    chunks.push(bytes);
  }

  return Buffer.concat(chunks);
}

function errorStatus(code: string): number {
  if (
    code === "invalid_signature" ||
    code === "missing_signature_header" ||
    code === "stale_timestamp" ||
    code === "invalid_timestamp"
  ) {
    return 401;
  }
  if (code === "request_too_large") return 413;
  return 400;
}

export function createMockReceiverServer({
  secret,
  store,
  nowSeconds = () => Math.floor(Date.now() / 1_000),
}: MockReceiverOptions) {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/rows") {
      sendJson(response, 200, { rows: store.list() });
      return;
    }

    if (request.method !== "POST" || request.url !== "/webhook/opshub") {
      sendJson(response, 404, { ok: false, code: "not_found" });
      return;
    }

    try {
      const body = await readBody(request);
      const event = verifySignedWebhook({
        body,
        headers: request.headers,
        secret,
        nowSeconds: nowSeconds(),
      });
      store.upsert(mapApprovedRequestToRow(event));

      sendJson(response, 200, {
        ok: true,
        event_id: event.event_id,
        request_reference: event.request.reference,
        effect: "upserted",
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "invalid_request";
      sendJson(response, errorStatus(code), { ok: false, code });
    }
  });
}
