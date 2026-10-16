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
