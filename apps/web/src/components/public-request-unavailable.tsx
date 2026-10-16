import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

type PublicRequestUnavailableProps = {
  locale: AppLocale;
  publicId: string;
  reason?: "not-found" | "service-unavailable";
};

const copy = {
  en: {
    "service-unavailable": {
      eyebrow: "Temporary interruption",
      title: "Request service is temporarily unavailable",
      description:
        "We could not connect to the request service. Your information has not been submitted. Please try again shortly.",
      action: "Try again",
    },
    "not-found": {
      eyebrow: "Request unavailable",
      title: "This request form is not available",
      description:
        "The link may be incorrect, or this form may no longer accept requests. Check the link or contact the team that shared it with you.",
      action: "Back to home",
    },
  },
  ar: {
    "service-unavailable": {
      eyebrow: "توقف مؤقت",
      title: "خدمة الطلبات غير متاحة مؤقتاً",
      description:
        "تعذر الاتصال بخدمة الطلبات. لم يتم إرسال بياناتك. حاول مرة أخرى بعد قليل.",
      action: "حاول مرة أخرى",
    },
    "not-found": {
      eyebrow: "النموذج غير متاح",
      title: "نموذج الطلب هذا غير متاح",
      description:
        "قد يكون الرابط غير صحيح أو قد يكون النموذج قد توقف عن استقبال الطلبات. راجع الرابط أو تواصل مع الفريق الذي أرسله إليك.",
      action: "العودة إلى الرئيسية",
    },
  },
} as const;

export function PublicRequestUnavailable({
  locale,
  publicId,
  reason = "service-unavailable",
}: PublicRequestUnavailableProps) {
  const labels = copy[locale][reason];
  const href =
    reason === "service-unavailable"
      ? `/${locale}/request/${publicId}`
      : `/${locale}`;

  return (
    <main className="confirmation-main">
      <section className="confirmation-card">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
        <Link className="primary-action" href={href}>
          {labels.action}
        </Link>
      </section>
    </main>
  );
}
