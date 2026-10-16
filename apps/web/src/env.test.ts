import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./env";

describe("validateEnvironment", () => {
  const supabaseEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value",
  };

  it("uses the local application URL when none is supplied", () => {
    expect(validateEnvironment(supabaseEnvironment)).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      ...supabaseEnvironment,
    });
  });

  it("rejects a malformed public application URL", () => {
    expect(() =>
      validateEnvironment({
        ...supabaseEnvironment,
        NEXT_PUBLIC_APP_URL: "not-a-url",
      }),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("requires the public Supabase connection values", () => {
    expect(() => validateEnvironment({})).toThrow();
  });
});
