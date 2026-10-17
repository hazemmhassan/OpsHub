"use client";

import { useState } from "react";

import type { AppLocale } from "@/i18n/locale";

const copy = {
  en: {
    retry: "Retry delivery",
    question: "Retry this delivery with one additional attempt?",
    confirm: "Confirm retry",
    cancel: "Cancel",
  },
  ar: {
    retry: "إعادة محاولة التسليم",
    question: "هل تريد إعادة التسليم مع إضافة محاولة واحدة؟",
    confirm: "تأكيد إعادة المحاولة",
    cancel: "إلغاء",
  },
} as const;

export function DeliveryRetryConfirmation({ locale }: { locale: AppLocale }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const labels = copy[locale];

  if (!isConfirming) {
    return (
      <button
        className="danger-action"
        onClick={() => setIsConfirming(true)}
        type="button"
      >
        {labels.retry}
      </button>
    );
  }

  return (
    <div className="approval-confirmation" aria-live="polite">
      <p>{labels.question}</p>
      <div className="approval-confirmation-actions">
        <button className="danger-action" type="submit">
          {labels.confirm}
        </button>
        <button
          className="secondary-action"
          onClick={() => setIsConfirming(false)}
          type="button"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
