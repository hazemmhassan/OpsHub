import { describe, expect, it } from "vitest";

import { readWorkerConfig } from "./config.js";

const validEnvironment = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SECRET_KEY: "service-role-test-key-with-enough-length",
  OPSHUB_WEBHOOK_ALLOWED_ORIGINS:
    "https://automation.example.test,http://127.0.0.1:5678",
  OPSHUB_WEBHOOK_SIGNING_SECRET: "phase-six-signing-secret-with-32-characters",
};

describe("readWorkerConfig", () => {
  it("applies the approved Phase 6 timing defaults", () => {
    expect(readWorkerConfig(validEnvironment, "worker-host-123")).toMatchObject(
      {
        workerId: "worker-host-123",
        batchSize: 10,
        leaseSeconds: 60,
        pollIntervalMs: 5_000,
        allowInsecureLocalWebhook: false,
        allowedOrigins: [
          "https://automation.example.test",
          "http://127.0.0.1:5678",
        ],
        signingSecrets: {
          OPSHUB_WEBHOOK_SIGNING_SECRET:
            "phase-six-signing-secret-with-32-characters",
        },
      },
    );
  });

  it("accepts bounded explicit worker settings and the local HTTP exception", () => {
    expect(
      readWorkerConfig(
        {
          ...validEnvironment,
          OPSHUB_WORKER_ID: "worker-a",
          OPSHUB_WORKER_BATCH_SIZE: "20",
          OPSHUB_WORKER_LEASE_SECONDS: "120",
          OPSHUB_WORKER_POLL_INTERVAL_MS: "250",
          OPSHUB_ALLOW_INSECURE_LOCAL_WEBHOOK: "true",
        },
        "fallback-worker",
      ),
    ).toMatchObject({
      workerId: "worker-a",
      batchSize: 20,
      leaseSeconds: 120,
      pollIntervalMs: 250,
      allowInsecureLocalWebhook: true,
    });
  });

  it.each([
    [{ SUPABASE_SECRET_KEY: undefined }, "missing database credential"],
    [{ OPSHUB_WORKER_BATCH_SIZE: "21" }, "unbounded batch"],
    [{ OPSHUB_WORKER_LEASE_SECONDS: "15" }, "lease shorter than HTTP timeout"],
    [{ OPSHUB_WEBHOOK_ALLOWED_ORIGINS: "" }, "missing destination allowlist"],
    [{ OPSHUB_WEBHOOK_SIGNING_SECRET: "short" }, "weak signing secret"],
  ])(
    "rejects %s instead of starting with unsafe configuration",
    (override, _label) => {
      expect(() =>
        readWorkerConfig(
          { ...validEnvironment, ...override },
          "worker-host-123",
        ),
      ).toThrow("invalid_worker_environment");
    },
  );
});
