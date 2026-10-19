import { z } from "zod";

const aiEnvironmentSchema = z
  .object({
    AI_INTAKE_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AI_SERVICE_URL: z.url().default("http://127.0.0.1:8001"),
    AI_INTERNAL_KEY: z.string().min(32).optional(),
  })
  .superRefine((value, context) => {
    if (value.AI_INTAKE_ENABLED && !value.AI_INTERNAL_KEY) {
      context.addIssue({
        code: "custom",
        path: ["AI_INTERNAL_KEY"],
        message: "AI_INTERNAL_KEY is required when AI intake is enabled.",
      });
    }
  });

export type AiEnvironment = z.infer<typeof aiEnvironmentSchema>;

export function validateAiEnvironment(
  input: Record<string, string | undefined>,
): AiEnvironment {
  return aiEnvironmentSchema.parse(input);
}
