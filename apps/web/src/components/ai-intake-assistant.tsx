"use client";

import { useState, useTransition } from "react";

import type { AiTurnInput, AiTurnResponse } from "@/ai/contracts";
import type { AppLocale } from "@/i18n/locale";

type AiIntakeAssistantProps = {
  action: (input: AiTurnInput) => Promise<AiTurnResponse>;
  buildInput: (
    message: string,
    turnNumber: number,
    sessionId: string,
  ) => AiTurnInput;
  locale: AppLocale;
  onPatch: (patch: AiTurnResponse["draft_patch"]) => void;
  sessionId: string;
};

const copy = {
  en: {
    open: "Use the assistant",
    close: "Continue with the normal form",
    title: "Describe your request with help",
    notice:
      "This optional assistant may send your message to an external AI provider. Do not share passwords, payment details, identity documents, health information, or other sensitive data.",
    label: "Message to assistant",
    placeholder: "Describe what your team needs or ask about a service.",
    send: "Ask assistant",
    sending: "Thinking…",
    source: "Source",
    limit:
      "The assistant reached its 12-message limit. Continue with the normal form.",
    unavailable: "The assistant is unavailable. Continue with the normal form.",
  },
  ar: {
    open: "استخدام المساعد",
    close: "المتابعة بالنموذج العادي",
    title: "صِف طلبك بمساعدة بسيطة",
    notice:
      "قد يرسل هذا المساعد الاختياري رسالتك إلى مزود ذكاء اصطناعي خارجي. لا تشارك كلمات المرور أو بيانات الدفع أو مستندات الهوية أو المعلومات الصحية أو أي بيانات حساسة أخرى.",
    label: "رسالة إلى المساعد",
    placeholder: "اشرح ما يحتاجه فريقك أو اسأل عن إحدى الخدمات.",
    send: "اسأل المساعد",
    sending: "جارٍ التفكير…",
    source: "المصدر",
    limit: "وصل المساعد إلى حد 12 رسالة. تابع باستخدام النموذج العادي.",
    unavailable: "المساعد غير متاح الآن. تابع باستخدام النموذج العادي.",
  },
} as const;

export function AiIntakeAssistant({
  action,
  buildInput,
  locale,
  onPatch,
  sessionId,
}: AiIntakeAssistantProps) {
  const labels = copy[locale];
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [turnNumber, setTurnNumber] = useState(1);
  const [response, setResponse] = useState<AiTurnResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  function send() {
    const cleanMessage = message.trim();
    if (!cleanMessage || isPending || turnNumber > 12) return;
    const input = buildInput(cleanMessage, turnNumber, sessionId);
    startTransition(() => {
      void action(input)
        .then((result) => {
          setResponse(result);
          onPatch(result.draft_patch);
          setTurnNumber((current) => current + 1);
          setMessage("");
        })
        .catch(() => {
          setResponse({
            schema_version: "ai-intake-turn-v1",
            status: "fallback",
            assistant_message: labels.unavailable,
            draft_patch: {},
            next_field: null,
            citations: [],
            handoff_reason: "provider_unavailable",
          });
        });
    });
  }

  if (!open) {
    return (
      <button
        className="assistant-open"
        type="button"
        onClick={() => setOpen(true)}
      >
        {labels.open}
      </button>
    );
  }

  return (
    <section className="assistant-panel" aria-labelledby="assistant-title">
      <div className="assistant-heading">
        <div>
          <p className="eyebrow">OpsHub AI</p>
          <h2 id="assistant-title">{labels.title}</h2>
        </div>
        <button
          type="button"
          className="text-action"
          onClick={() => setOpen(false)}
        >
          {labels.close}
        </button>
      </div>
      <p className="assistant-notice">{labels.notice}</p>
      {response ? (
        <div className="assistant-response" role="log" aria-live="polite">
          <p>{response.assistant_message}</p>
          {response.citations.map((citation) => (
            <small key={citation.chunk_id}>
              {labels.source}: {citation.title}
            </small>
          ))}
        </div>
      ) : null}
      {turnNumber > 12 ? <p role="status">{labels.limit}</p> : null}
      <label>
        {labels.label}
        <textarea
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={labels.placeholder}
          rows={4}
          value={message}
        />
      </label>
      <button
        className="secondary-action"
        disabled={isPending || !message.trim() || turnNumber > 12}
        onClick={send}
        type="button"
      >
        {isPending ? labels.sending : labels.send}
      </button>
    </section>
  );
}
