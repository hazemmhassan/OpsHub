"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getStaffAccess } from "@/auth/current-staff";
import type { AppLocale } from "@/i18n/locale";
import { createServiceClient } from "@/lib/supabase/service";

const routeSchema = z.object({
  locale: z.enum(["ar", "en"]),
  deliveryId: z.uuid(),
});

function detailPath(locale: AppLocale, deliveryId: string, state?: string) {
  const base = `/${locale}/staff/deliveries/${deliveryId}`;
  return state ? `${base}?state=${state}` : base;
}

export async function retryDeliveryAction(
  locale: AppLocale,
  deliveryId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  const route = routeSchema.safeParse({ locale, deliveryId });
  if (!route.success) redirect(`/${locale}/staff/deliveries`);

  const access = await getStaffAccess();
  if (access.status === "signed-out")
    redirect(`/${route.data.locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${route.data.locale}/staff/access-denied`);
  if (access.role !== "admin")
    redirect(`/${route.data.locale}/staff/admin-required`);

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("manual_retry", {
    p_delivery_id: route.data.deliveryId,
    p_actor_user_id: access.userId,
  });
  if (error)
    redirect(detailPath(route.data.locale, route.data.deliveryId, "conflict"));

  revalidatePath(`/${route.data.locale}/staff/deliveries`);
  revalidatePath(detailPath(route.data.locale, route.data.deliveryId));
  revalidatePath(`/${route.data.locale}/staff`);
  redirect(detailPath(route.data.locale, route.data.deliveryId, "retried"));
}
