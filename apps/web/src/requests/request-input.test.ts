import { describe, expect, it } from "vitest";

import { parseRequestInput } from "./request-input";

const validInput = {
  requesterType: "individual",
  contactName: "  Hazem   Hassan  ",
  email: "  HAZEM@Example.com ",
  phone: "٠١٠١٢٣٤٥٦٧٨",
  countryCode: "EG",
  serviceCategory: "consulting",
  requestTitle: "Operations support request",
  description: "We need help organizing our incoming service requests.",
  desiredStartDate: "2026-10-20",
  preferredContactMethod: "email",
  submittedLocale: "en",
  consentTextVersion: "consent-en-v1",
  consent: true,
  companyName: "Injected Company",
  jobTitle: "Injected role",
  companyWebsite: "javascript:alert(1)",
};

describe("parseRequestInput", () => {
  it("normalizes bilingual contact data and drops company fields for an individual", () => {
    expect(parseRequestInput(validInput, "2026-10-16")).toMatchObject({
      requesterType: "individual",
      contactName: "Hazem Hassan",
      email: "hazem@example.com",
      phoneRaw: "٠١٠١٢٣٤٥٦٧٨",
      phoneE164: "+201012345678",
      phoneCountryMismatch: false,
      companyName: null,
      jobTitle: null,
      companyWebsite: null,
    });
  });

  it("accepts omitted company fields from an individual browser form", () => {
    expect(
      parseRequestInput(
        {
          ...validInput,
          companyName: null,
          jobTitle: null,
          companyWebsite: null,
        },
        "2026-10-16",
      ),
    ).toMatchObject({
      requesterType: "individual",
      companyName: null,
      jobTitle: null,
      companyWebsite: null,
    });
  });

  it("adds HTTPS to a company website that has no scheme", () => {
    expect(
      parseRequestInput(
        {
          ...validInput,
          requesterType: "company",
          companyName: "Example Company",
          companyWebsite: "example.com/services",
        },
        "2026-10-16",
      ).companyWebsite,
    ).toBe("https://example.com/services");
  });

  it("keeps a valid phone-country mismatch as a warning", () => {
    expect(
      parseRequestInput(
        { ...validInput, countryCode: "SA", phone: "+201012345678" },
        "2026-10-16",
      ).phoneCountryMismatch,
    ).toBe(true);
  });

  it("rejects missing consent, unsafe websites, and past dates", () => {
    expect(() =>
      parseRequestInput(
        {
          ...validInput,
          requesterType: "company",
          companyName: "Example Company",
          companyWebsite: "javascript:alert(1)",
          desiredStartDate: "2026-10-15",
          consent: false,
        },
        "2026-10-16",
      ),
    ).toThrow();
  });
});
