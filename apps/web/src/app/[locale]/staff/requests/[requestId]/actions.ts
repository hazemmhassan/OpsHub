"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getStaffAccess } from "@/auth/current-staff";
import type { AppLocale } from "@/i18n/locale";
import { createServiceClient } from "@/lib/supabase/service";

const routeSchema = z.object({
  locale: z.enum(["ar", "en"]),
  requestId: z.uuid(),
});
const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved"), reason: z.null() }),
  z.object({
    decision: z.literal("rejected"),
    reason: z.string().trim().min(5).max(500),
  }),
]);

async function requireActor(locale: AppLocale) {
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect(`/${locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${locale}/staff/access-denied`);
  return access;
}

function detailPath(locale: AppLocale, requestId: string, error?: string) {
  const base = `/${locale}/staff/requests/${requestId}`;
  return error ? `${base}?error=${error}` : base;
}

export async function startReviewAction(
  locale: AppLocale,
  requestId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  const route = routeSchema.safeParse({ locale, requestId });
  if (!route.success) redirect(`/${locale}/staff`);
  const actor = await requireActor(route.data.locale);
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("start_review", {
    p_request_id: route.data.requestId,
    p_actor_user_id: actor.userId,
  });
  if (error)
    redirect(detailPath(route.data.locale, route.data.requestId, "conflict"));
  revalidatePath(`/${route.data.locale}/staff`);
  revalidatePath(detailPath(route.data.locale, route.data.requestId));
  redirect(detailPath(route.data.locale, route.data.requestId));
}

export async function decideRequestAction(
  locale: AppLocale,
  requestId: string,
  formData: FormData,
): Promise<void> {
  const route = routeSchema.safeParse({ locale, requestId });
  if (!route.success) redirect(`/${locale}/staff`);
  const decisionValue = formData.get("decision");
  const decision = decisionSchema.safeParse({
    decision: decisionValue,
    reason: decisionValue === "rejected" ? formData.get("reason") : null,
  });
  if (!decision.success)
    redirect(detailPath(route.data.locale, route.data.requestId, "invalid"));

  const actor = await requireActor(route.data.locale);
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("decide_request", {
    p_request_id: route.data.requestId,
    p_actor_user_id: actor.userId,
    p_decision: decision.data.decision,
    p_reason: decision.data.reason,
  });
  if (error)
    redirect(detailPath(route.data.locale, route.data.requestId, "conflict"));
  revalidatePath(`/${route.data.locale}/staff`);
  revalidatePath(detailPath(route.data.locale, route.data.requestId));
  redirect(detailPath(route.data.locale, route.data.requestId));
}
