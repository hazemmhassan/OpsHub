import { describe, expect, it } from "vitest";

import { classifySignInError, parseSignInInput } from "./sign-in";

describe("parseSignInInput", () => {
  it("normalizes the email and accepts a non-empty password", () => {
    expect(
      parseSignInInput({
        email: "  STAFF@Example.com ",
        password: "a private password",
        locale: "en",
      }),
    ).toEqual({
      email: "staff@example.com",
      password: "a private password",
      locale: "en",
    });
  });

  it("rejects invalid credentials and unrecognized locales before auth", () => {
    expect(() =>
      parseSignInInput({ email: "invalid", password: "", locale: "fr" }),
    ).toThrow();
  });

  it("distinguishes an unavailable auth service from bad credentials", () => {
    expect(
      classifySignInError({ name: "AuthRetryableFetchError", status: 0 }),
    ).toBe("service-unavailable");
    expect(classifySignInError({ name: "AuthApiError", status: 400 })).toBe(
      "invalid-credentials",
    );
  });
});
