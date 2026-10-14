import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./env";

describe("validateEnvironment", () => {
  it("uses the local application URL when none is supplied", () => {
    expect(validateEnvironment({})).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });

  it("rejects a malformed public application URL", () => {
    expect(() =>
      validateEnvironment({
        NEXT_PUBLIC_APP_URL: "not-a-url",
      }),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
