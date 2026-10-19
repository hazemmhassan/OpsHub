"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { aiTurnInputSchema, type AiTurnResponse } from "@/ai/contracts";
import { getAiEnvironment } from "@/ai/server-environment";
import { createAiFallback, requestAiTurn } from "@/ai/server-client";
import { verifyAiSessionToken } from "@/ai/session-token";
import { getServerEnvironment } from "@/env/server";
import type { AppLocale } from "@/i18n/locale";
import { createServiceClient } from "@/lib/supabase/service";
import { createSubmissionSubjectHash } from "@/requests/public-submission";

const routeSchema = z.object({
  locale: z.enum(["ar", "en"]),
  publicId: z.string().regex(/^[A-Za-z0-9_-]{20,120}$/u),
});

export async function runPublicAiTurn(
  expectedLocale: AppLocale,
  expectedPublicId: string,
  unsafeInput: unknown,
): Promise<AiTurnResponse> {
  const route = routeSchema.safeParse({
    locale: expectedLocale,
    publicId: expectedPublicId,
  });
  const input = aiTurnInputSchema.safeParse(unsafeInput);
  if (!route.success || !input.success) {
    return createAiFallback(expectedLocale, "provider_invalid_output");
  }
  const serverEnvironment = getServerEnvironment();
  const sessionIsValid = verifyAiSessionToken(input.data.sessionId, {
    locale: route.data.locale,
    publicId: route.data.publicId,
    secret: serverEnvironment.PUBLIC_SUBMISSION_RATE_LIMIT_KEY,
  });
  if (!sessionIsValid) {
    return createAiFallback(route.data.locale, "provider_invalid_output");
  }

  let environment;
  try {
    environment = getAiEnvironment();
  } catch {
    return createAiFallback(route.data.locale, "ai_disabled");
  }
  if (!environment.AI_INTAKE_ENABLED) {
    return requestAiTurn(input.data, route.data.locale, environment);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("public_forms")
    .select("id")
    .eq("public_id", route.data.publicId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) {
    return createAiFallback(route.data.locale, "provider_unavailable");
  }

  const requestHeaders = await headers();
  const networkSubject =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  const subjectHash = createSubmissionSubjectHash(
    data.id,
    `ai:${networkSubject}`,
    serverEnvironment.PUBLIC_SUBMISSION_RATE_LIMIT_KEY,
  );
  const { data: budget, error: budgetError } = await supabase.rpc(
    "consume_ai_intake_rate_limit",
    {
      p_public_form_id: data.id,
      p_subject_hash: `\\x${subjectHash}`,
    },
  );
  if (budgetError || !budget?.[0]?.allowed) {
    return createAiFallback(route.data.locale, "rate_limited");
  }

  return requestAiTurn(input.data, route.data.locale, environment);
}
