import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const demoOrganizationId = "00000000-0000-4000-8000-000000000001";

function readLocalSupabaseEnvironment() {
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const cliPath = path.join(
    repositoryRoot,
    "node_modules",
    "supabase",
    "dist",
    "supabase.js",
  );
  const output = execFileSync(
    process.execPath,
    [cliPath, "status", "-o", "env"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  const values = new Map<string, string>();

  for (const line of output.split(/\r?\n/u)) {
    const match = /^([A-Z_]+)="?(.*?)"?$/u.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) {
      values.set(match[1], match[2]);
    }
  }

  const url = values.get("API_URL");
  const serviceRoleKey = values.get("SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Local Supabase is not ready for browser tests.");
  }

  return { serviceRoleKey, url };
}

export type LocalStaffAccount = {
  admin: SupabaseClient;
  email: string;
  password: string;
  userId: string;
};

export async function createLocalStaffAccount(): Promise<LocalStaffAccount> {
  const { serviceRoleKey, url } = readLocalSupabaseEnvironment();
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `phase7-${randomUUID()}@example.test`;
  const password = `Local-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  if (error || !data.user) {
    throw new Error("Could not create the synthetic browser-test account.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: data.user.id,
    display_name: "Phase 7 Browser Test",
    preferred_locale: "en",
  });
  const { error: membershipError } = await admin
    .from("organization_members")
    .insert({
      org_id: demoOrganizationId,
      user_id: data.user.id,
      role: "admin",
      is_active: true,
    });

  if (profileError || membershipError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error("Could not authorize the synthetic browser-test account.");
  }

  return { admin, email, password, userId: data.user.id };
}

export async function removeLocalTestData(
  account: LocalStaffAccount,
  reference?: string,
) {
  if (reference) {
    const { data: request, error: requestLookupError } = await account.admin
      .from("requests")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();
    if (requestLookupError) {
      throw new Error("Could not locate synthetic browser-test data.");
    }

    if (request) {
      for (const table of [
        "audit_events",
        "approval_decisions",
        "integration_deliveries",
        "request_submission_snapshots",
        "requests",
      ]) {
        const column = table === "requests" ? "id" : "request_id";
        const { error } = await account.admin
          .from(table)
          .delete()
          .eq(column, request.id);
        if (error) {
          throw new Error(`Could not clean synthetic data from ${table}.`);
        }
      }
    }
  }

  const { error: profileError } = await account.admin
    .from("profiles")
    .delete()
    .eq("user_id", account.userId);
  if (profileError) {
    throw new Error("Could not clean the synthetic browser-test profile.");
  }
  const { error: userError } = await account.admin.auth.admin.deleteUser(
    account.userId,
  );
  if (userError) {
    throw new Error("Could not clean the synthetic browser-test user.");
  }
}
