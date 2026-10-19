import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { AppLocale } from "@/i18n/locale";

const MAX_AGE_SECONDS = 30 * 60;
const FUTURE_SKEW_SECONDS = 60;

type SessionContext = {
  locale: AppLocale;
  publicId: string;
  secret: string;
};

type CreateSessionContext = SessionContext & {
  issuedAtSeconds?: number;
  nonce?: string;
};

type VerifySessionContext = SessionContext & {
  nowSeconds?: number;
};

function signature(
  issuedAt: string,
  nonce: string,
  context: SessionContext,
): string {
  return createHmac("sha256", context.secret)
    .update(`v1.${issuedAt}.${nonce}.${context.locale}.${context.publicId}`)
    .digest("base64url");
}

export function createAiSessionToken(context: CreateSessionContext): string {
  const issuedAt = Math.floor(
    context.issuedAtSeconds ?? Date.now() / 1000,
  ).toString(36);
  const nonce = context.nonce ?? randomBytes(12).toString("base64url");
  return `${issuedAt}.${nonce}.${signature(issuedAt, nonce, context)}`;
}

export function verifyAiSessionToken(
  token: string,
  context: VerifySessionContext,
): boolean {
  const [issuedAt, nonce, suppliedSignature, ...extra] = token.split(".");
  if (
    extra.length ||
    !issuedAt ||
    !nonce ||
    !suppliedSignature ||
    !/^[a-z0-9]+$/u.test(issuedAt) ||
    !/^[A-Za-z0-9_-]+$/u.test(nonce)
  ) {
    return false;
  }

  const issuedAtSeconds = Number.parseInt(issuedAt, 36);
  const nowSeconds = Math.floor(context.nowSeconds ?? Date.now() / 1000);
  if (
    !Number.isSafeInteger(issuedAtSeconds) ||
    issuedAtSeconds > nowSeconds + FUTURE_SKEW_SECONDS ||
    nowSeconds - issuedAtSeconds > MAX_AGE_SECONDS
  ) {
    return false;
  }

  const expected = Buffer.from(signature(issuedAt, nonce, context));
  const supplied = Buffer.from(suppliedSignature);
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}
