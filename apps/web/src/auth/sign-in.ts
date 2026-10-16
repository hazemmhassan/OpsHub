import { z } from "zod";

import { locales } from "@/i18n/locale";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(1024),
  locale: z.enum(locales),
});

export type SignInInput = z.infer<typeof signInSchema>;

export function parseSignInInput(input: unknown): SignInInput {
  return signInSchema.parse(input);
}

export function safelyParseSignInInput(input: unknown) {
  return signInSchema.safeParse(input);
}

type AuthErrorLike = {
  name?: string;
  status?: number;
};

export function classifySignInError(
  error: AuthErrorLike | null,
): "invalid-credentials" | "service-unavailable" | null {
  if (!error) {
    return null;
  }

  if (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    (typeof error.status === "number" && error.status >= 500)
  ) {
    return "service-unavailable";
  }

  return "invalid-credentials";
}
