export type WorkerConfig = {
  supabaseUrl: string;
  supabaseSecretKey: string;
  workerId: string;
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMs: number;
  allowedOrigins: string[];
  allowInsecureLocalWebhook: boolean;
  signingSecrets: Record<string, string>;
};

export function readWorkerConfig(
  environment: Record<string, string | undefined>,
  runtimeWorkerId: string,
): WorkerConfig {
  const integer = (minimum: number, maximum: number, fallback: string) =>
    z
      .string()
      .default(fallback)
      .transform(Number)
      .pipe(z.number().int().min(minimum).max(maximum));

  const schema = z.object({
    SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(20),
    OPSHUB_WORKER_ID: z.string().trim().min(1).max(120).optional(),
    OPSHUB_WORKER_BATCH_SIZE: integer(1, 20, "10"),
    OPSHUB_WORKER_LEASE_SECONDS: integer(16, 300, "60"),
    OPSHUB_WORKER_POLL_INTERVAL_MS: integer(250, 60_000, "5000"),
    OPSHUB_ALLOW_INSECURE_LOCAL_WEBHOOK: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    OPSHUB_WEBHOOK_ALLOWED_ORIGINS: z.string().trim().min(1),
    OPSHUB_WEBHOOK_SIGNING_SECRET: z.string().min(32),
  });

  try {
    const parsed = schema.parse(environment);
    const allowedOrigins = parsed.OPSHUB_WEBHOOK_ALLOWED_ORIGINS.split(",").map(
      (origin) => {
        const value = origin.trim();
        const url = new URL(value);
        if (url.href !== `${url.origin}/`) {
          throw new Error("origin_must_not_include_path");
        }
        return url.origin;
      },
    );

    const workerId = parsed.OPSHUB_WORKER_ID ?? runtimeWorkerId.trim();
    if (!workerId || workerId.length > 120) {
      throw new Error("invalid_worker_id");
    }

    return {
      supabaseUrl: parsed.SUPABASE_URL,
      supabaseSecretKey: parsed.SUPABASE_SECRET_KEY,
      workerId,
      batchSize: parsed.OPSHUB_WORKER_BATCH_SIZE,
      leaseSeconds: parsed.OPSHUB_WORKER_LEASE_SECONDS,
      pollIntervalMs: parsed.OPSHUB_WORKER_POLL_INTERVAL_MS,
      allowedOrigins,
      allowInsecureLocalWebhook: parsed.OPSHUB_ALLOW_INSECURE_LOCAL_WEBHOOK,
      signingSecrets: {
        OPSHUB_WEBHOOK_SIGNING_SECRET: parsed.OPSHUB_WEBHOOK_SIGNING_SECRET,
      },
    };
  } catch (error) {
    throw new Error("invalid_worker_environment", { cause: error });
  }
}
import { z } from "zod";
