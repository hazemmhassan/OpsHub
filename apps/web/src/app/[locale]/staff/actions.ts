"use server";

import { redirect } from "next/navigation";

import { decideStaffAccess } from "@/auth/staff-access";
import { classifySignInError, safelyParseSignInInput } from "@/auth/sign-in";
import type { SignInState } from "@/components/staff-sign-in";
import { locales, type AppLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";

function isLocale(value: string): value is AppLocale {
  return locales.some((locale) => locale === value);
}

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const result = safelyParseSignInInput({
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });

  if (!result.success) {
    return { status: "invalid-input" };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (signInError) {
    return {
      status: classifySignInError(signInError) ?? "invalid-credentials",
    };
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (claimsError) {
    await supabase.auth.signOut();
    return { status: "service-unavailable" };
  }

  if (!userId) {
    await supabase.auth.signOut();
    return { status: "invalid-credentials" };
  }

  const { data, error: membershipError } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations!inner(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError) {
    await supabase.auth.signOut();
    return { status: "service-unavailable" };
  }

  const access = decideStaffAccess(userId, data ?? []);

  if (access.status !== "authorized") {
    redirect(`/${result.data.locale}/staff/access-denied`);
  }

  redirect(`/${result.data.locale}/staff`);
}

export async function signOut(locale: string): Promise<void> {
  const safeLocale = isLocale(locale) ? locale : "ar";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${safeLocale}/staff/sign-in`);
}
