"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AppLocale } from "@/i18n/locale";

export type SignInState = {
  status:
    "idle" | "invalid-input" | "invalid-credentials" | "service-unavailable";
};

type StaffSignInProps = {
  action: (state: SignInState, formData: FormData) => Promise<SignInState>;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    invalidInput?: string;
    invalidCredentials: string;
    serviceUnavailable: string;
  };
  initialState: SignInState;
  locale: AppLocale;
};

function SubmitButton({
  submit,
  submitting,
}: Pick<StaffSignInProps["copy"], "submit" | "submitting">) {
  const { pending } = useFormStatus();

  return (
    <button
      className="primary-action auth-submit"
      disabled={pending}
      type="submit"
    >
      {pending ? submitting : submit}
    </button>
  );
}

export function StaffSignIn({
  action,
  copy,
  initialState,
  locale,
}: StaffSignInProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errorMessage =
    state.status === "service-unavailable"
      ? copy.serviceUnavailable
      : state.status === "invalid-credentials"
        ? copy.invalidCredentials
        : state.status === "invalid-input"
          ? (copy.invalidInput ?? copy.invalidCredentials)
          : null;

  return (
    <main className="auth-main" id="main-content" tabIndex={-1}>
      <section className="auth-card" aria-labelledby="staff-sign-in-title">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="staff-sign-in-title">{copy.title}</h1>
        <p className="auth-description">{copy.description}</p>

        <form action={formAction} className="auth-form">
          <input name="locale" type="hidden" value={locale} />
          <label>
            <span>{copy.emailLabel}</span>
            <input
              autoComplete="username"
              dir="ltr"
              inputMode="email"
              maxLength={320}
              name="email"
              required
              type="email"
            />
          </label>
          <label>
            <span>{copy.passwordLabel}</span>
            <input
              autoComplete="current-password"
              dir="ltr"
              maxLength={1024}
              name="password"
              required
              type="password"
            />
          </label>

          {errorMessage ? (
            <p role="alert" className="auth-error">
              {errorMessage}
            </p>
          ) : null}
          <SubmitButton submit={copy.submit} submitting={copy.submitting} />
        </form>
      </section>
    </main>
  );
}
