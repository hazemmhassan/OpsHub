import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

import { DeliveryRetryConfirmation } from "./delivery-retry-confirmation";

export type StaffDeliveryDetailRecord = {
  id: string;
  requestId: string;
  requestReference: string;
  requestTitle: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  availableAt: string;
  lastAttemptAt: string | null;
  lastHttpStatus: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  succeededAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TimelineEvent = { id: string; eventType: string; createdAt: string };

const copy = {
  en: {
    back: "Back to delivery diagnostics",
    request: "Open request",
    status: "Status",
    attempts: "Attempts used",
    available: "Available from",
    lastAttempt: "Last attempt",
    httpStatus: "HTTP status",
    errorCode: "Error code",
    errorMessage: "What happened",
    succeeded: "Succeeded at",
    created: "Created",
    updated: "Last updated",
    activity: "Delivery activity",
    empty: "Not available",
    pending: "Pending",
    processing: "Processing",
    succeededStatus: "Succeeded",
    failed: "Failed",
    dead: "Stopped",
    delivery_attempt_started: "Delivery attempt started",
    delivery_succeeded: "Delivery succeeded",
    delivery_failed: "Delivery failed",
    delivery_dead: "Delivery stopped",
    manual_retry: "Manual retry requested",
  },
  ar: {
    back: "العودة إلى تشخيص التسليم",
    request: "فتح الطلب",
    status: "الحالة",
    attempts: "المحاولات المستخدمة",
    available: "متاح من",
    lastAttempt: "آخر محاولة",
    httpStatus: "حالة HTTP",
    errorCode: "رمز الخطأ",
    errorMessage: "ما الذي حدث",
    succeeded: "وقت النجاح",
    created: "تاريخ الإنشاء",
    updated: "آخر تحديث",
    activity: "نشاط التسليم",
    empty: "غير متوفر",
    pending: "قيد الانتظار",
    processing: "قيد التنفيذ",
    succeededStatus: "تم بنجاح",
    failed: "فشل",
    dead: "متوقف",
    delivery_attempt_started: "بدأت محاولة التسليم",
    delivery_succeeded: "نجح التسليم",
    delivery_failed: "فشل التسليم",
    delivery_dead: "توقف التسليم",
    manual_retry: "طُلبت إعادة المحاولة",
  },
} as const;

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StaffDeliveryDetail({
  delivery,
  locale,
  message = null,
  messageTone = "error",
  retryAction,
  timeline,
}: {
  delivery: StaffDeliveryDetailRecord;
  locale: AppLocale;
  message?: string | null;
  messageTone?: "error" | "success";
  retryAction: (formData: FormData) => void | Promise<void>;
  timeline: TimelineEvent[];
}) {
  const labels = copy[locale];
  const statusKey =
    delivery.status === "succeeded" ? "succeededStatus" : delivery.status;
  const fields: [string, string | number | null][] = [
    [labels.status, labels[statusKey as keyof typeof labels] as string],
    [labels.attempts, `${delivery.attemptCount} / ${delivery.maxAttempts}`],
    [labels.available, formatDate(delivery.availableAt, locale)],
    [labels.lastAttempt, formatDate(delivery.lastAttemptAt, locale)],
    [
      labels.httpStatus,
      delivery.lastHttpStatus ? `HTTP ${delivery.lastHttpStatus}` : null,
    ],
    [labels.errorCode, delivery.lastErrorCode],
    [labels.errorMessage, delivery.lastErrorMessage],
    [labels.succeeded, formatDate(delivery.succeededAt, locale)],
    [labels.created, formatDate(delivery.createdAt, locale)],
    [labels.updated, formatDate(delivery.updatedAt, locale)],
  ];

  return (
    <main className="staff-main request-detail" id="main-content" tabIndex={-1}>
      <Link className="text-action" href={`/${locale}/staff/deliveries`}>
        {labels.back}
      </Link>
      <header className="request-detail-heading">
        <div>
          <p className="eyebrow">{delivery.requestReference}</p>
          <h1>{delivery.requestTitle}</h1>
        </div>
        <span className={`status-badge status-${delivery.status}`}>
          {labels[statusKey as keyof typeof labels] as string}
        </span>
      </header>
      {message ? (
        <p
          className={`status-message status-message-${messageTone}`}
          role={messageTone === "success" ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}
      <section className="detail-card">
        <Link
          className="text-action"
          href={`/${locale}/staff/requests/${delivery.requestId}`}
        >
          {labels.request}
        </Link>
        <dl className="request-facts">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value ?? labels.empty}</dd>
            </div>
          ))}
        </dl>
      </section>
      {delivery.status === "failed" || delivery.status === "dead" ? (
        <section className="decision-card">
          <form action={retryAction}>
            <DeliveryRetryConfirmation locale={locale} />
          </form>
        </section>
      ) : null}
      <section className="timeline-card">
        <h2>{labels.activity}</h2>
        <ol className="timeline">
          {timeline.map((event) => (
            <li key={event.id}>
              <strong>
                {(labels[event.eventType as keyof typeof labels] as string) ??
                  event.eventType}
              </strong>
              <time dateTime={event.createdAt}>
                {formatDate(event.createdAt, locale)}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
