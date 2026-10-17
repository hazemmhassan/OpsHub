import { InMemoryApprovedRequestStore } from "./mock-receiver-store.js";
import { createMockReceiverServer } from "./mock-receiver-server.js";

const secret = process.env.OPSHUB_WEBHOOK_SIGNING_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "OPSHUB_WEBHOOK_SIGNING_SECRET must contain at least 32 characters.",
  );
}

const port = Number(process.env.OPSHUB_MOCK_RECEIVER_PORT ?? "5679");
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("OPSHUB_MOCK_RECEIVER_PORT must be a valid TCP port.");
}

const store = new InMemoryApprovedRequestStore();
const server = createMockReceiverServer({ secret, store });

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `${JSON.stringify({ level: "info", event: "mock_receiver_started", url: `http://127.0.0.1:${port}` })}\n`,
  );
});
