import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

import { ApprovalConfirmation } from "./approval-confirmation";

export type StaffRequestDetailRecord = {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
  reviewStartedAt: string | null;
  decidedAt: string | null;
  requesterType: string;
  contactName: string;
  email: string;
  phoneRaw: string;
  phoneE164: string;
  countryCode: string;
  serviceCategory: string;
  title: string;
  description: string;
  desiredStartDate: string | null;
  preferredContactMethod: string | null;
  submittedLocale: string;
  companyName: string | null;
  jobTitle: string | null;
  companyWebsite: string | null;
};

type Decision = {
  decision: string;
  reason: string | null;
  actorRole: string;
  createdAt: string;
} | null;

type TimelineEvent = {
  id: string;
  eventType: string;
  createdAt: string;
};

type StaffRequestDetailProps = {
  locale: AppLocale;
  request: StaffRequestDetailRecord;
  decision: Decision;
  timeline: TimelineEvent[];
  startReviewAction: (formData: FormData) => void | Promise<void>;
  decideAction: (formData: FormData) => void | Promise<void>;
  error?: string | null;
};

const labels = {
  en: {
    back: "Back to requests",
    reference: "Reference",
    submitted: "Submitted",
    contact: "Contact name",
    email: "Email",
    phone: "Phone",
    country: "Country",
    category: "Service category",
    requesterType: "Requester type",
    language: "Submitted language",
    startDate: "Desired start date",
    method: "Preferred contact method",
    company: "Company name",
    jobTitle: "Job title",
    website: "Company website",
    description: "Request details",
    timeline: "Activity",
    startReview: "Start review",
    approve: "Approve request",
    reject: "Reject request",
    rejectionReason: "Rejection reason",
    reasonHint: "Explain the reason in at least 5 characters.",
    decision: "Decision",
    reason: "Reason",
    empty: "Not provided",
  },
  ar: {
    back: "العودة إلى الطلبات",
    reference: "الرقم المرجعي",
    submitted: "تاريخ التقديم",
    contact: "اسم جهة الاتصال",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    country: "الدولة",
    category: "فئة الخدمة",
    requesterType: "نوع مقدم الطلب",
    language: "لغة الطلب",
    startDate: "تاريخ البدء المطلوب",
    method: "طريقة التواصل المفضلة",
    company: "اسم الشركة",
    jobTitle: "المسمى الوظيفي",
    website: "موقع الشركة",
    description: "تفاصيل الطلب",
    timeline: "النشاط",
    startReview: "بدء المراجعة",
    approve: "قبول الطلب",
    reject: "رفض الطلب",
    rejectionReason: "سبب الرفض",
    reasonHint: "اشرح السبب في 5 أحرف على الأقل.",
    decision: "القرار",
    reason: "السبب",
    empty: "غير متوفر",
  },
} as const;

const statusLabels = {
  en: {
    submitted: "Submitted",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
  },
  ar: {
    submitted: "مُقدَّم",
    under_review: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
  },
} as const;

const eventLabels = {
  en: {
    request_submitted: "Request submitted",
    review_started: "Review started",
    request_approved: "Request approved",
    request_rejected: "Request rejected",
    job_created: "Delivery job created",
    delivery_attempt_started: "Delivery attempt started",
    delivery_succeeded: "Delivery succeeded",
    delivery_failed: "Delivery failed",
    delivery_dead: "Delivery stopped",
    manual_retry: "Manual retry requested",
  },
  ar: {
    request_submitted: "تم تقديم الطلب",
    review_started: "بدأت المراجعة",
    request_approved: "تم قبول الطلب",
    request_rejected: "تم رفض الطلب",
    job_created: "تم إنشاء مهمة التسليم",
    delivery_attempt_started: "بدأت محاولة التسليم",
    delivery_succeeded: "نجح التسليم",
    delivery_failed: "فشل التسليم",
    delivery_dead: "توقف التسليم",
    manual_retry: "طُلبت إعادة المحاولة",
  },
} as const;

const valueLabels = {
  en: {
    requesterType: { individual: "Individual", company: "Company" },
    serviceCategory: {
      consulting: "Consulting",
      it_software: "IT and software",
      marketing: "Marketing",
      training: "Training",
      support_maintenance: "Support and maintenance",
      other: "Other",
    },
    language: { ar: "Arabic", en: "English" },
    contactMethod: { email: "Email", phone: "Phone" },
  },
  ar: {
    requesterType: { individual: "فرد", company: "شركة" },
    serviceCategory: {
      consulting: "استشارات",
      it_software: "تقنية المعلومات والبرمجيات",
      marketing: "تسويق",
      training: "تدريب",
      support_maintenance: "دعم وصيانة",
      other: "أخرى",
    },
    language: { ar: "العربية", en: "الإنجليزية" },
    contactMethod: { email: "البريد الإلكتروني", phone: "رقم الهاتف" },
  },
} as const;

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StaffRequestDetail({
  locale,
  request,
  decision,
  timeline,
  startReviewAction,
  decideAction,
  error,
}: StaffRequestDetailProps) {
  const copy = labels[locale];
  const status =
    statusLabels[locale][
      request.status as keyof (typeof statusLabels)[typeof locale]
    ];
  const values = valueLabels[locale];
  const country =
    new Intl.DisplayNames([locale], { type: "region" }).of(
      request.countryCode,
    ) ?? request.countryCode;
  const fields = [
    [copy.reference, request.reference],
    [copy.submitted, formatDate(request.submittedAt, locale)],
    [
      copy.requesterType,
      values.requesterType[
        request.requesterType as keyof typeof values.requesterType
      ] ?? request.requesterType,
    ],
    [copy.contact, request.contactName],
    [copy.email, request.email],
    [copy.phone, `${request.phoneRaw} (${request.phoneE164})`],
    [copy.country, country],
    [
      copy.category,
      values.serviceCategory[
        request.serviceCategory as keyof typeof values.serviceCategory
      ] ?? request.serviceCategory,
    ],
    [
      copy.language,
      values.language[
        request.submittedLocale as keyof typeof values.language
      ] ?? request.submittedLocale,
    ],
    [copy.startDate, request.desiredStartDate],
    [
      copy.method,
      request.preferredContactMethod
        ? (values.contactMethod[
            request.preferredContactMethod as keyof typeof values.contactMethod
          ] ?? request.preferredContactMethod)
        : null,
    ],
    [copy.company, request.companyName],
    [copy.jobTitle, request.jobTitle],
    [copy.website, request.companyWebsite],
  ];

  return (
    <main className="staff-main request-detail">
      <Link className="text-action" href={`/${locale}/staff`}>
        {copy.back}
      </Link>
      <header className="request-detail-heading">
        <div>
          <p className="eyebrow">{request.reference}</p>
          <h1>{request.title}</h1>
        </div>
        <span className={`status-badge status-${request.status}`}>
          {status}
        </span>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="detail-card">
        <h2>{copy.description}</h2>
        <p className="request-description">{request.description}</p>
        <dl className="request-facts">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || copy.empty}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="decision-card">
        {request.status === "submitted" ? (
          <form action={startReviewAction}>
            <button className="primary-action" type="submit">
              {copy.startReview}
            </button>
          </form>
        ) : null}

        {request.status === "under_review" ? (
          <div className="decision-actions">
            <form action={decideAction}>
              <input name="decision" type="hidden" value="approved" />
              <ApprovalConfirmation locale={locale} />
            </form>
            <form action={decideAction} className="reject-form">
              <input name="decision" type="hidden" value="rejected" />
              <label htmlFor="rejection-reason">{copy.rejectionReason}</label>
              <textarea
                id="rejection-reason"
                name="reason"
                minLength={5}
                maxLength={500}
                required
              />
              <small>{copy.reasonHint}</small>
              <button className="danger-action" type="submit">
                {copy.reject}
              </button>
            </form>
          </div>
        ) : null}

        {decision ? (
          <dl className="decision-summary">
            <div>
              <dt>{copy.decision}</dt>
              <dd>
                {
                  statusLabels[locale][
                    decision.decision as "approved" | "rejected"
                  ]
                }
              </dd>
            </div>
            {decision.reason ? (
              <div>
                <dt>{copy.reason}</dt>
                <dd>{decision.reason}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      <section className="timeline-card">
        <h2>{copy.timeline}</h2>
        <ol className="timeline">
          {timeline.map((event) => (
            <li key={event.id}>
              <strong>
                {eventLabels[locale][
                  event.eventType as keyof (typeof eventLabels)[typeof locale]
                ] ?? event.eventType}
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
