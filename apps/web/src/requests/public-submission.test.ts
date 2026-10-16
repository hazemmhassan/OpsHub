import { describe, expect, it } from "vitest";

import {
  classifyPublicFormLookup,
  createSubmissionSubjectHash,
  getOrganizationDate,
} from "./public-submission";

describe("public submission helpers", () => {
  it("uses the organization timezone for date-only validation", () => {
    const instant = new Date("2026-10-15T22:30:00.000Z");

    expect(getOrganizationDate("Africa/Cairo", instant)).toBe("2026-10-16");
    expect(getOrganizationDate("UTC", instant)).toBe("2026-10-15");
  });

  it("creates a stable non-reversible rate-limit subject", () => {
    const hash = createSubmissionSubjectHash(
      "00000000-0000-4000-8000-000000000011",
      "127.0.0.1",
      "a-secure-development-key-with-32-characters",
    );

    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(hash).not.toContain("127.0.0.1");
    expect(hash).toBe(
      createSubmissionSubjectHash(
        "00000000-0000-4000-8000-000000000011",
        "127.0.0.1",
        "a-secure-development-key-with-32-characters",
      ),
    );
  });

  it("distinguishes a service outage from a missing public form", () => {
    expect(classifyPublicFormLookup(null, { message: "fetch failed" })).toBe(
      "service-unavailable",
    );
    expect(classifyPublicFormLookup(null, null)).toBe("not-found");
    expect(classifyPublicFormLookup({ publicId: "request-form" }, null)).toBe(
      "available",
    );
  });
});
