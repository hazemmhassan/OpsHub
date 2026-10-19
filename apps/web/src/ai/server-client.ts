import "server-only";

import type { AppLocale } from "@/i18n/locale";

import {
  aiTurnInputSchema,
  aiTurnResponseSchema,
  type AiTurnInput,
  type AiTurnResponse,
} from "./contracts";
import type { AiEnvironment } from "./environment";

export function createAiFallback(
  locale: AppLocale,
  reason:
    | "ai_disabled"
    | "provider_invalid_output"
    | "provider_unavailable"
    | "rate_limited"
    | "budget_exhausted",
): AiTurnResponse {
  const message =
    reason === "rate_limited"
      ? locale === "ar"
        ? "وصلت إلى حد استخدام المساعد حالياً. تابع باستخدام النموذج العادي."
        : "You reached the assistant usage limit. Continue with the normal form."
      : reason === "budget_exhausted"
        ? locale === "ar"
          ? "الرسالة أكبر من الحد الآمن للمساعد. اختصرها أو تابع بالنموذج العادي."
          : "The message exceeds the assistant's safe limit. Shorten it or continue with the normal form."
        : locale === "ar"
          ? "تعذر تشغيل المساعد الآن. يمكنك متابعة الطلب من خلال النموذج العادي."
          : "The assistant is unavailable. You can continue with the normal form.";
  return {
    schema_version: "ai-intake-turn-v1",
    status: "fallback",
    assistant_message: message,
    draft_patch: {},
    citations: [],
    handoff_reason: reason,
  };
}

export async function requestAiTurn(
  unsafeInput: AiTurnInput,
  locale: AppLocale,
  environment: AiEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<AiTurnResponse> {
  if (!environment.AI_INTAKE_ENABLED) {
    return createAiFallback(locale, "ai_disabled");
  }

  const input = aiTurnInputSchema.safeParse(unsafeInput);
  if (!input.success || !environment.AI_INTERNAL_KEY) {
    return createAiFallback(locale, "provider_invalid_output");
  }

  try {
    const response = await fetcher(
      `${environment.AI_SERVICE_URL}/v1/intake/turn`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-OpsHub-AI-Key": environment.AI_INTERNAL_KEY,
        },
        body: JSON.stringify({
          schema_version: "ai-intake-turn-v1",
          locale,
          session_id: input.data.sessionId,
          turn_number: input.data.turnNumber,
          latest_message: input.data.latestMessage,
          draft: input.data.draft,
          completed_fields: input.data.completedFields,
        }),
        signal: AbortSignal.timeout(13_000),
      },
    );
    if (!response.ok) {
      return createAiFallback(locale, "provider_unavailable");
    }

    const parsed = aiTurnResponseSchema.safeParse(await response.json());
    return parsed.success
      ? parsed.data
      : createAiFallback(locale, "provider_invalid_output");
  } catch {
    return createAiFallback(locale, "provider_unavailable");
  }
}
