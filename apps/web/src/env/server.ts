import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  PUBLIC_SUBMISSION_RATE_LIMIT_KEY: z.string().min(32),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function validateServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(input);
}

export function getServerEnvironment(): ServerEnvironment {
  return validateServerEnvironment({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    PUBLIC_SUBMISSION_RATE_LIMIT_KEY:
      process.env.PUBLIC_SUBMISSION_RATE_LIMIT_KEY,
  });
}
