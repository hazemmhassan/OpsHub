import type { ClaimedDelivery } from "./delivery-processor.js";

type WorkerBatchDependencies = {
  claim: (
    batchSize: number,
    workerId: string,
    leaseSeconds: number,
  ) => Promise<ClaimedDelivery[]>;
  process: (
    delivery: ClaimedDelivery,
  ) => Promise<{ kind: "succeeded" | "failed"; deliveryId: string }>;
  batchSize: number;
  workerId: string;
  leaseSeconds: number;
};

export async function runWorkerBatch(dependencies: WorkerBatchDependencies) {
  const deliveries = await dependencies.claim(
    dependencies.batchSize,
    dependencies.workerId,
    dependencies.leaseSeconds,
  );
  const results = await Promise.allSettled(
    deliveries.map((delivery) => dependencies.process(delivery)),
  );

  return results.reduce(
    (summary, result) => {
      if (result.status === "rejected") {
        summary.errors += 1;
      } else if (result.value.kind === "succeeded") {
        summary.succeeded += 1;
      } else {
        summary.failed += 1;
      }
      return summary;
    },
    {
      claimed: deliveries.length,
      succeeded: 0,
      failed: 0,
      errors: 0,
    },
  );
}
