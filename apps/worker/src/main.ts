import { hostname } from "node:os";

import { createClient } from "@supabase/supabase-js";

import { readWorkerConfig } from "./config.js";
import { processDelivery } from "./delivery-processor.js";
import { getSafeWorkerErrorCode } from "./safe-error.js";
import { sendWebhook } from "./webhook-client.js";
import { SupabaseDeliveryRepository } from "./supabase-repository.js";
import { runWorkerBatch } from "./worker-runner.js";

let stopping = false;

function requestStop() {
  stopping = true;
}

process.once("SIGINT", requestStop);
process.once("SIGTERM", requestStop);

async function wait(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const config = readWorkerConfig(process.env, `${hostname()}-${process.pid}`);
  const client = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const repository = new SupabaseDeliveryRepository(client);
  const once = process.argv.includes("--once");

  do {
    try {
      const summary = await runWorkerBatch({
        claim: (batchSize, workerId, leaseSeconds) =>
          repository.claim(batchSize, workerId, leaseSeconds),
        process: (delivery) =>
          processDelivery(delivery, {
            recorder: repository,
            secrets: config.signingSecrets,
            endpointPolicy: {
              allowedOrigins: config.allowedOrigins,
              allowInsecureLocal: config.allowInsecureLocalWebhook,
            },
            now: () => new Date(),
            random: Math.random,
            send: sendWebhook,
          }),
        batchSize: config.batchSize,
        workerId: config.workerId,
        leaseSeconds: config.leaseSeconds,
      });

      console.info(
        JSON.stringify({ event: "worker_batch_completed", ...summary }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "worker_batch_failed",
          code: getSafeWorkerErrorCode(error),
        }),
      );
      if (once) {
        throw error;
      }
    }

    if (!once && !stopping) {
      await wait(config.pollIntervalMs);
    }
  } while (!once && !stopping);
}

await main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "worker_stopped",
      code: getSafeWorkerErrorCode(error),
    }),
  );
  process.exitCode = 1;
});
