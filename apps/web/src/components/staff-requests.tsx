import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

export type StaffRequestSummary = {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
  title: string;
  contactName: string;
  submittedLocale: string;
};

const labels = {
  en: {
    title: "Requests",
    empty: "No requests match these filters",
    ar: "Arabic",
    en: "English",
    submitted: "Submitted",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
    search: "Search requests",
    all: "All statuses",
    filter: "Apply filters",
    team: "Current team",
    signOut: "Sign out",
    deliveries: "Delivery diagnostics",
  },
  ar: {
    title: "الطلبات",
    empty: "لا توجد طلبات مطابقة",
    ar: "العربية",
    en: "الإنجليزية",
    submitted: "مُقدَّم",
    under_review: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    search: "البحث في الطلبات",
    all: "كل الحالات",
    filter: "تطبيق الفلاتر",
    team: "الفريق الحالي",
    signOut: "تسجيل الخروج",
    deliveries: "تشخيص التسليم",
  },
} as const;

type StaffRequestsProps = {
  locale: AppLocale;
  requests: StaffRequestSummary[];
  filters?: { q: string; status: string };
  organizationName?: string;
  roleLabel?: string;
  signOutAction?: () => void | Promise<void>;
  canViewDeliveries?: boolean;
};

export function StaffRequests({
  locale,
  requests,
  filters = { q: "", status: "" },
  organizationName,
  roleLabel,
  signOutAction,
  canViewDeliveries = false,
}: StaffRequestsProps) {
  const copy = labels[locale];
  const statuses = [
    "submitted",
    "under_review",
    "approved",
    "rejected",
  ] as const;
  return (
    <main className="staff-main" id="main-content" tabIndex={-1}>
      {organizationName && roleLabel && signOutAction ? (
        <div className="staff-session">
          <div>
            <span>{copy.team}</span>
            <strong>{organizationName}</strong>
            <small>{roleLabel}</small>
          </div>
          <form action={signOutAction}>
            <button className="text-action" type="submit">
              {copy.signOut}
            </button>
          </form>
        </div>
      ) : null}
      <div className="staff-heading">
        <h1>{copy.title}</h1>
        {canViewDeliveries ? (
          <Link
            className="secondary-action"
            href={`/${locale}/staff/deliveries`}
          >
            {copy.deliveries}
          </Link>
        ) : null}
      </div>
      <form className="request-filters" method="get">
        <label>
          <span className="sr-only">{copy.search}</span>
          <input
            aria-label={copy.search}
            defaultValue={filters.q}
            name="q"
            placeholder={copy.search}
          />
        </label>
        <label>
          <span className="sr-only">{copy.all}</span>
          <select
            aria-label={copy.all}
            defaultValue={filters.status}
            name="status"
          >
            <option value="">{copy.all}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {copy[status]}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-action" type="submit">
          {copy.filter}
        </button>
      </form>
      {requests.length === 0 ? (
        <div className="request-panel">
          <p>{copy.empty}</p>
        </div>
      ) : (
        <ul className="request-list">
          {requests.map((request) => (
            <li key={request.id}>
              <Link href={`/${locale}/staff/requests/${request.id}`}>
                <strong>{request.title}</strong>
                <span>
                  {request.contactName} · {request.reference}
                </span>
                <span>
                  <span>{copy[request.status as keyof typeof copy]}</span> ·{" "}
                  <span>{copy[request.submittedLocale as "ar" | "en"]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
