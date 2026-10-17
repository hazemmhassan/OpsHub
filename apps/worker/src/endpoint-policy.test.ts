import { describe, expect, it } from "vitest";

import { assertAllowedEndpoint } from "./endpoint-policy.js";

describe("assertAllowedEndpoint", () => {
  it("accepts an exact allowlisted HTTPS origin", () => {
    expect(
      assertAllowedEndpoint("https://automation.example.test/webhook/opshub", {
        allowedOrigins: ["https://automation.example.test"],
        allowInsecureLocal: false,
      }).href,
    ).toBe("https://automation.example.test/webhook/opshub");
  });

  it("rejects a deceptive subdomain that is not the exact allowlisted origin", () => {
    expect(() =>
      assertAllowedEndpoint("https://automation.example.test.evil.test/hook", {
        allowedOrigins: ["https://automation.example.test"],
        allowInsecureLocal: false,
      }),
    ).toThrow("endpoint_not_allowlisted");
  });

  it("rejects HTTP unless the explicit local-development exception is enabled", () => {
    const policy = {
      allowedOrigins: ["http://127.0.0.1:5678"],
      allowInsecureLocal: false,
    };

    expect(() =>
      assertAllowedEndpoint("http://127.0.0.1:5678/webhook/opshub", policy),
    ).toThrow("endpoint_https_required");

    expect(
      assertAllowedEndpoint("http://127.0.0.1:5678/webhook/opshub", {
        ...policy,
        allowInsecureLocal: true,
      }).href,
    ).toBe("http://127.0.0.1:5678/webhook/opshub");
  });

  it.each([
    "https://user:password@automation.example.test/webhook",
    "https://automation.example.test/webhook#secret",
  ])("rejects unsafe URL components in %s", (url) => {
    expect(() =>
      assertAllowedEndpoint(url, {
        allowedOrigins: ["https://automation.example.test"],
        allowInsecureLocal: false,
      }),
    ).toThrow("invalid_endpoint_url");
  });
});
