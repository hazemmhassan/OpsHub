import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAiSessionToken, verifyAiSessionToken } from "./session-token";

const secret = "test-session-secret-with-at-least-32-characters";

describe("AI session tokens", () => {
  it("accepts a fresh token only for its original form and locale", () => {
    const token = createAiSessionToken({
      locale: "en",
      publicId: "opshub-demo-request-form",
      secret,
      issuedAtSeconds: 1_800_000_000,
      nonce: "0123456789abcdef",
    });

    expect(token).toMatch(/^[A-Za-z0-9_.-]{12,128}$/u);
    expect(
      verifyAiSessionToken(token, {
        locale: "en",
        publicId: "opshub-demo-request-form",
        secret,
        nowSeconds: 1_800_000_300,
      }),
    ).toBe(true);
    expect(
      verifyAiSessionToken(token, {
        locale: "ar",
        publicId: "opshub-demo-request-form",
        secret,
        nowSeconds: 1_800_000_300,
      }),
    ).toBe(false);
  });

  it("rejects tampered and expired tokens", () => {
    const token = createAiSessionToken({
      locale: "ar",
      publicId: "opshub-demo-request-form",
      secret,
      issuedAtSeconds: 1_800_000_000,
      nonce: "fedcba9876543210",
    });
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    expect(
      verifyAiSessionToken(tampered, {
        locale: "ar",
        publicId: "opshub-demo-request-form",
        secret,
        nowSeconds: 1_800_000_100,
      }),
    ).toBe(false);
    expect(
      verifyAiSessionToken(token, {
        locale: "ar",
        publicId: "opshub-demo-request-form",
        secret,
        nowSeconds: 1_800_001_801,
      }),
    ).toBe(false);
  });

  it("accepts base64url underscores inside the nonce and signature", () => {
    const token = createAiSessionToken({
      locale: "en",
      publicId: "opshub-demo-request-form",
      secret,
      issuedAtSeconds: 1_800_000_000,
      nonce: "nonce_with_underscores",
    });

    expect(
      verifyAiSessionToken(token, {
        locale: "en",
        publicId: "opshub-demo-request-form",
        secret,
        nowSeconds: 1_800_000_100,
      }),
    ).toBe(true);
  });
});
