import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import {
  StaffDeliveries,
  type StaffDeliverySummary,
} from "@/components/staff-deliveries";
import { StaffLoading } from "@/components/staff-loading";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

type DeliveryRow = {
  id: string;
  request_id: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  updated_at: string;
};

export default function DeliveriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <DeliveriesPageContent params={params} />
    </Suspense>
  );
}

async function DeliveriesPageContent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect(`/${locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${locale}/staff/access-denied`);
  if (access.role !== "admin") redirect(`/${locale}/staff/admin-required`);

  const supabase = await createClient();
  const deliveryResult = await supabase
    .from("integration_deliveries")
    .select("id, request_id, status, attempt_count, max_attempts, updated_at")
    .order("updated_at", { ascending: false });
  if (deliveryResult.error)
    throw new Error("Unable to load delivery diagnostics.");

  const deliveryRows = (deliveryResult.data ?? []) as DeliveryRow[];
  const requestIds = deliveryRows.map((delivery) => delivery.request_id);
  const [requestResult, snapshotResult] = requestIds.length
    ? await Promise.all([
        supabase.from("requests").select("id, reference").in("id", requestIds),
        supabase
          .from("request_submission_snapshots")
          .select("request_id, request_title")
          .in("request_id", requestIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (requestResult.error || snapshotResult.error)
    throw new Error("Unable to load delivery request details.");

  const requests = new Map(
    (requestResult.data ?? []).map((request) => [
      request.id,
      request.reference,
    ]),
  );
  const titles = new Map(
    (snapshotResult.data ?? []).map((snapshot) => [
      snapshot.request_id,
      snapshot.request_title,
    ]),
  );
  const deliveries: StaffDeliverySummary[] = deliveryRows.map((delivery) => ({
    id: delivery.id,
    requestId: delivery.request_id,
    requestReference: requests.get(delivery.request_id) ?? "",
    requestTitle:
      titles.get(delivery.request_id) ??
      requests.get(delivery.request_id) ??
      "",
    status: delivery.status,
    attemptCount: delivery.attempt_count,
    maxAttempts: delivery.max_attempts,
    updatedAt: delivery.updated_at,
  }));

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  return (
    <div className="page-shell staff-shell">
      <SiteHeader
        area="staff"
        locale={locale}
        labels={{
          brand: common("brand"),
          home: common("home"),
          teamWorkspace: common("teamWorkspace"),
          languages: { ar: common("arabic"), en: common("english") },
        }}
      />
      <StaffDeliveries deliveries={deliveries} locale={locale} />
    </div>
  );
}
