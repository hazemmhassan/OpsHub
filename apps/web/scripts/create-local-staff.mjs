import { createClient } from "@supabase/supabase-js";

const demoOrganizationId = "00000000-0000-4000-8000-000000000001";
const localHosts = new Set(["127.0.0.1", "localhost"]);

function readRequiredEnvironment(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment value: ${name}`);
  }

  return value;
}

const supabaseUrl = readRequiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = readRequiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const email = readRequiredEnvironment("OPSHUB_LOCAL_STAFF_EMAIL").toLowerCase();
const password = readRequiredEnvironment("OPSHUB_LOCAL_STAFF_PASSWORD");
const displayName =
  process.env.OPSHUB_LOCAL_STAFF_NAME?.trim() || "Local Staff User";
const role = process.env.OPSHUB_LOCAL_STAFF_ROLE?.trim() || "admin";
const locale = process.env.OPSHUB_LOCAL_STAFF_LOCALE?.trim() || "en";
const url = new URL(supabaseUrl);

if (!localHosts.has(url.hostname)) {
  throw new Error("This helper is restricted to a local Supabase instance.");
}

if (!email.includes("@") || password.length < 8) {
  throw new Error(
    "Use a valid email and a password with at least 8 characters.",
  );
}

if (!new Set(["admin", "approver"]).has(role)) {
  throw new Error("OPSHUB_LOCAL_STAFF_ROLE must be admin or approver.");
}

if (!new Set(["ar", "en"]).has(locale)) {
  throw new Error("OPSHUB_LOCAL_STAFF_LOCALE must be ar or en.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: listedUsers, error: listError } =
  await supabase.auth.admin.listUsers();

if (listError) {
  throw new Error("Could not inspect local staff accounts.");
}

let user = listedUsers.users.find(
  (candidate) => candidate.email?.toLowerCase() === email,
);

if (user) {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
    password,
  });

  if (error) {
    throw new Error("Could not update the local staff account.");
  }

  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });

  if (error) {
    throw new Error("Could not create the local staff account.");
  }

  user = data.user;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  user_id: user.id,
  display_name: displayName,
  preferred_locale: locale,
});

if (profileError) {
  throw new Error("Could not create the local staff profile.");
}

const { error: membershipError } = await supabase
  .from("organization_members")
  .upsert(
    {
      org_id: demoOrganizationId,
      user_id: user.id,
      role,
      is_active: true,
    },
    { onConflict: "org_id,user_id" },
  );

if (membershipError) {
  throw new Error("Could not create the local organization membership.");
}

console.log(`Local ${role} account is ready for ${email}.`);
