import { describe, expect, it } from "vitest";

import { runWorkerBatch } from "./worker-runner.js";
import type { ClaimedDelivery } from "./delivery-processor.js";

const deliveries = [
  { deliveryId: "00000000-0000-4000-8000-000000000821" },
  { deliveryId: "00000000-0000-4000-8000-000000000822" },
] as ClaimedDelivery[];

describe("runWorkerBatch", () => {
  it("isolates a failed delivery so the rest of the claimed batch still runs", async () => {
    const processed: string[] = [];

    const summary = await runWorkerBatch({
      claim: async () => deliveries,
      process: async (delivery) => {
        processed.push(delivery.deliveryId);
        if (delivery.deliveryId.endsWith("821")) {
          throw new Error("database result write failed");
        }
        return { kind: "succeeded" as const, deliveryId: delivery.deliveryId };
      },
      batchSize: 10,
      workerId: "worker-a",
      leaseSeconds: 60,
    });

    expect(processed).toEqual([
      "00000000-0000-4000-8000-000000000821",
      "00000000-0000-4000-8000-000000000822",
    ]);
    expect(summary).toEqual({
      claimed: 2,
      succeeded: 1,
      failed: 0,
      errors: 1,
    });
  });
});
