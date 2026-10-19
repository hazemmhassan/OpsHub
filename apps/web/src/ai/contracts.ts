import { z } from "zod";

export const serviceCategorySchema = z.enum([
  "consulting",
  "it_software",
  "marketing",
  "training",
  "support_maintenance",
  "other",
]);

const nextFieldSchema = z.enum([
  "requester_type",
  "contact_name",
  "email",
  "phone",
  "country",
  "service_category",
  "request_title",
  "description",
  "desired_start_date",
  "preferred_contact_method",
  "company_name",
  "job_title",
  "company_website",
  "consent",
]);

const modelSafeDraftSchema = z
  .object({
    requester_type: z.enum(["individual", "company"]).nullable().optional(),
    service_category: serviceCategorySchema.nullable().optional(),
    request_title: z.string().max(120).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    company_name: z.string().max(160).nullable().optional(),
    job_title: z.string().max(120).nullable().optional(),
    company_website: z.string().max(2048).nullable().optional(),
  })
  .strict();

export const aiTurnInputSchema = z
  .object({
    sessionId: z.string().regex(/^[A-Za-z0-9_.-]{12,128}$/u),
    turnNumber: z.number().int().min(1).max(12),
    latestMessage: z.string().trim().min(1).max(2000),
    draft: modelSafeDraftSchema,
    completedFields: z.array(nextFieldSchema).max(15),
  })
  .strict();

const draftPatchSchema = modelSafeDraftSchema.extend({
  request_title: z.string().min(5).max(120).nullable().optional(),
  description: z.string().min(20).max(2000).nullable().optional(),
  company_name: z.string().min(1).max(160).nullable().optional(),
  job_title: z.string().min(1).max(120).nullable().optional(),
});

export const aiTurnResponseSchema = z
  .object({
    schema_version: z.literal("ai-intake-turn-v1"),
    status: z.enum([
      "collecting",
      "answering",
      "review_ready",
      "handoff",
      "fallback",
    ]),
    assistant_message: z.string().min(1).max(2000),
    draft_patch: draftPatchSchema.default({}),
    next_field: nextFieldSchema.nullable().optional(),
    citations: z
      .array(
        z
          .object({
            chunk_id: z.string().min(1).max(120),
            title: z.string().min(1).max(200),
            locale: z.enum(["ar", "en"]),
          })
          .strict(),
      )
      .max(3),
    handoff_reason: z
      .enum([
        "ai_disabled",
        "provider_unavailable",
        "provider_invalid_output",
        "unsupported_question",
        "sensitive_data",
        "human_requested",
        "rate_limited",
        "budget_exhausted",
      ])
      .nullable()
      .optional(),
  })
  .strict();

export type AiTurnInput = z.infer<typeof aiTurnInputSchema>;
export type AiTurnResponse = z.infer<typeof aiTurnResponseSchema>;
