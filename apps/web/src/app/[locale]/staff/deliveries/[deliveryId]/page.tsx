import { Suspense } from "react";

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getStaffAccess } from "@/auth/current-staff";
import { SiteHeader } from "@/components/site-header";
import {
  StaffDeliveryDetail,
  type StaffDeliveryDetailRecord,
} from "@/components/staff-delivery-detail";
import { StaffLoading } from "@/components/staff-loading";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

import { retryDeliveryAction } from "./actions";

type DeliveryRow = {
  id: string;
  request_id: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  available_at: string;
  last_attempt_at: string | null;
  last_http_status: number | null;
  last_error_code: string | null;
  last_error_message: string | null;
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
};

const notices = {
  en: {
    conflict:
      "This delivery changed before the retry completed. The latest state is shown below.",
    retried: "The delivery is queued for another attempt.",
  },
  ar: {
    conflict:
      "تغيّرت حالة التسليم قبل اكتمال إعادة المحاولة. تظهر أحدث حالة أدناه.",
    retried: "تم وضع التسليم في قائمة الانتظار لمحاولة جديدة.",
  },
} as const;

export default function DeliveryDetailPage(props: {
  params: Promise<{ locale: string; deliveryId: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  return (
    <Suspense fallback={<StaffLoading />}>
      <DeliveryDetailPageContent {...props} />
    </Suspense>
  );
}

async function DeliveryDetailPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; deliveryId: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { locale, deliveryId } = await params;
  if (
    !hasLocale(routing.locales, locale) ||
    !z.uuid().safeParse(deliveryId).success
  )
    notFound();
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect(`/${locale}/staff/sign-in`);
  if (access.status === "access-denied")
    redirect(`/${locale}/staff/access-denied`);
  if (access.role !== "admin") redirect(`/${locale}/staff/admin-required`);

  const supabase = await createClient();
  const deliveryResult = await supabase
    .from("integration_deliveries")
    .select(
      "id, request_id, status, attempt_count, max_attempts, available_at, last_attempt_at, last_http_status, last_error_code, last_error_message, succeeded_at, created_at, updated_at",
    )
    .eq("id", deliveryId)
    .maybeSingle();
  if (deliveryResult.error) throw new Error("Unable to load delivery details.");
  if (!deliveryResult.data) notFound();
  const row = deliveryResult.data as DeliveryRow;

  const [requestResult, snapshotResult, timelineResult] = await Promise.all([
    supabase
      .from("requests")
      .select("reference")
      .eq("id", row.request_id)
      .maybeSingle(),
    supabase
      .from("request_submission_snapshots")
      .select("request_title")
      .eq("request_id", row.request_id)
      .maybeSingle(),
    supabase
      .from("audit_events")
      .select("id, event_type, created_at")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  if (requestResult.error || snapshotResult.error || timelineResult.error)
    throw new Error("Unable to load delivery context.");
  if (!requestResult.data || !snapshotResult.data) notFound();

  const delivery: StaffDeliveryDetailRecord = {
    id: row.id,
    requestId: row.request_id,
    requestReference: requestResult.data.reference,
    requestTitle: snapshotResult.data.request_title,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    lastAttemptAt: row.last_attempt_at,
    lastHttpStatus: row.last_http_status,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    succeededAt: row.succeeded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  setRequestLocale(locale);
  const common = await getTranslations("Common");
  const query = await searchParams;
  const state =
    query.state === "conflict" || query.state === "retried"
      ? query.state
      : null;
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
      <StaffDeliveryDetail
        delivery={delivery}
        locale={locale}
        message={state ? notices[locale][state] : null}
        messageTone={state === "retried" ? "success" : "error"}
        retryAction={retryDeliveryAction.bind(null, locale, deliveryId)}
        timeline={(timelineResult.data ?? []).map((event) => ({
          id: String(event.id),
          eventType: event.event_type,
          createdAt: event.created_at,
        }))}
      />
    </div>
  );
}
