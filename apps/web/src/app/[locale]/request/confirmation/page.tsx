import { Suspense } from "react";

import Link from "next/link";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";

type ConfirmationPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string }>;
};

const copy = {
  en: {
    title: "Your request is in",
    description:
      "The team will review it and contact you using your preferred method.",
    reference: "Reference",
    guidance: "Keep this reference in case you need to contact the team.",
    home: "Back to home",
  },
  ar: {
    title: "تم استلام طلبك",
    description: "سيراجع الفريق طلبك ويتواصل معك بالطريقة التي اخترتها.",
    reference: "الرقم المرجعي",
    guidance: "احتفظ بهذا الرقم إذا احتجت إلى التواصل مع الفريق.",
    home: "العودة للرئيسية",
  },
} as const;

export default function ConfirmationPage(props: ConfirmationPageProps) {
  return (
    <Suspense
      fallback={
        <main
          className="confirmation-main"
          id="main-content"
          tabIndex={-1}
          aria-busy="true"
        />
      }
    >
      <ConfirmationPageContent {...props} />
    </Suspense>
  );
}

async function ConfirmationPageContent({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { locale } = await params;
  const { reference } = await searchParams;

  if (
    !hasLocale(routing.locales, locale) ||
    !reference ||
    !/^[0-9A-HJKMNP-TV-Z]{10}$/u.test(reference)
  ) {
    notFound();
  }

  const text = copy[locale];
  return (
    <main className="confirmation-main" id="main-content" tabIndex={-1}>
      <section className="confirmation-card">
        <p className="eyebrow">OpsHub</p>
        <h1>{text.title}</h1>
        <p>{text.description}</p>
        <div className="reference-card">
          <span>{text.reference}</span>
          <strong dir="ltr">{reference}</strong>
        </div>
        <p>{text.guidance}</p>
        <Link className="primary-action" href={`/${locale}`}>
          {text.home}
        </Link>
      </section>
    </main>
  );
}
