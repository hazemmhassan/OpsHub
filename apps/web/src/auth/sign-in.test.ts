import { describe, expect, it } from "vitest";

import { parseSignInInput } from "./sign-in";

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
});
