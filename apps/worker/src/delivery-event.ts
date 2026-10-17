import { z } from "zod";

const nullableString = z.string().nullable();

export const approvedRequestEventSchema = z
  .object({
    event_id: z.uuid(),
    event_type: z.literal("request.approved"),
    event_version: z.literal(1),
    occurred_at: z.iso.datetime({ offset: true }),
    request: z
      .object({
        reference: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{10}$/u),
        submitted_at: z.iso.datetime({ offset: true }),
        approved_at: z.iso.datetime({ offset: true }),
        submitted_locale: z.enum(["ar", "en"]),
        requester_type: z.enum(["individual", "company"]),
        contact_name: z.string().min(1),
        email: z.email(),
        phone_e164: z.string().regex(/^\+[1-9]\d{6,14}$/u),
        country_code: z.string().regex(/^[A-Z]{2}$/u),
        preferred_contact_method: z.enum(["email", "phone"]).nullable(),
        company_name: nullableString,
        job_title: nullableString,
        company_website: z.url().nullable(),
        service_category: z.enum([
          "consulting",
          "it_software",
          "marketing",
          "training",
          "support_maintenance",
          "other",
        ]),
        request_title: z.string().min(1),
        description: z.string().min(1),
        desired_start_date: z.iso.date().nullable(),
      })
      .strict(),
  })
  .strict();

export type ApprovedRequestEvent = z.infer<typeof approvedRequestEventSchema>;
