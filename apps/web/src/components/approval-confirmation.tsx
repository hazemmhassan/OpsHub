"use client";

import { useState } from "react";

import type { AppLocale } from "@/i18n/locale";

const copy = {
  en: {
    approve: "Approve request",
    question: "Approve this request and create its pending delivery job?",
    confirm: "Confirm approval",
    cancel: "Cancel",
  },
  ar: {
    approve: "قبول الطلب",
    question: "هل تريد قبول هذا الطلب وإنشاء مهمة التسليم المعلّقة؟",
    confirm: "تأكيد القبول",
    cancel: "إلغاء",
  },
} as const;

export function ApprovalConfirmation({ locale }: { locale: AppLocale }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const labels = copy[locale];

  if (!isConfirming) {
    return (
      <button
        className="primary-action"
        onClick={() => setIsConfirming(true)}
        type="button"
      >
        {labels.approve}
      </button>
    );
  }

  return (
    <div className="approval-confirmation" aria-live="polite">
      <p>{labels.question}</p>
      <div className="approval-confirmation-actions">
        <button className="primary-action" type="submit">
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
