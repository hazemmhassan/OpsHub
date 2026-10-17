import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

export type StaffDeliverySummary = {
  id: string;
  requestId: string;
  requestReference: string;
  requestTitle: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  updatedAt: string;
};

const copy = {
  en: {
    back: "Back to requests",
    title: "Delivery diagnostics",
    description: "See whether approved requests reached the connected service.",
    empty: "No delivery jobs yet",
    attempts: (current: number, maximum: number) =>
      `${current} of ${maximum} attempts`,
    pending: "Pending",
    processing: "Processing",
    succeeded: "Succeeded",
    failed: "Failed",
    dead: "Stopped",
  },
  ar: {
    back: "العودة إلى الطلبات",
    title: "تشخيص التسليم",
    description: "تحقق من وصول الطلبات المقبولة إلى الخدمة المتصلة.",
    empty: "لا توجد مهام تسليم بعد",
    attempts: (current: number, maximum: number) =>
      `${current} من ${maximum} محاولات`,
    pending: "قيد الانتظار",
    processing: "قيد التنفيذ",
    succeeded: "تم بنجاح",
    failed: "فشل",
    dead: "متوقف",
  },
} as const;

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StaffDeliveries({
  deliveries,
  locale,
}: {
  deliveries: StaffDeliverySummary[];
  locale: AppLocale;
}) {
  const labels = copy[locale];

  return (
    <main className="staff-main request-detail">
      <Link className="text-action" href={`/${locale}/staff`}>
        {labels.back}
      </Link>
      <header className="staff-heading">
        <div>
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
      </header>
      {deliveries.length === 0 ? (
        <div className="request-panel">
          <p>{labels.empty}</p>
        </div>
      ) : (
        <ul className="request-list delivery-list">
          {deliveries.map((delivery) => (
            <li key={delivery.id}>
              <Link href={`/${locale}/staff/deliveries/${delivery.id}`}>
                <strong>{delivery.requestTitle}</strong>
                <span>{delivery.requestReference}</span>
                <span>
                  <span className={`status-badge status-${delivery.status}`}>
                    {labels[delivery.status as keyof typeof labels] as string}
                  </span>{" "}
                  ·{" "}
                  <span>
                    {labels.attempts(
                      delivery.attemptCount,
                      delivery.maxAttempts,
                    )}
                  </span>
                  {" · "}
                  {formatDate(delivery.updatedAt, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
