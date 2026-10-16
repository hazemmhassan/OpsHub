import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { decideStaffAccess, type StaffAccess } from "./staff-access";

type MembershipRow = {
  org_id: string;
  role: string;
  organizations: { name: string } | { name: string }[] | null;
};

export const getStaffAccess = cache(async (): Promise<StaffAccess> => {
  await connection();
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return { status: "signed-out" };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations!inner(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error("Unable to verify staff access.");
  }

  return decideStaffAccess(userId, (data ?? []) as MembershipRow[]);
});
