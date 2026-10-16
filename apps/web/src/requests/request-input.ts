import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { z } from "zod";

const serviceCategories = [
  "consulting",
  "it_software",
  "marketing",
  "training",
  "support_maintenance",
  "other",
] as const;

const requestInputSchema = z.object({
  requesterType: z.enum(["individual", "company"]),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().min(2).max(64),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  serviceCategory: z.enum(serviceCategories),
  requestTitle: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(2000),
  desiredStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  preferredContactMethod: z
    .enum(["email", "phone"])
    .optional()
    .or(z.literal("")),
  submittedLocale: z.enum(["ar", "en"]),
  consentTextVersion: z.string().min(1).max(80),
  consent: z.literal(true),
  companyName: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().max(160).optional(),
  ),
  jobTitle: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().max(120).optional(),
  ),
  companyWebsite: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().max(2048).optional(),
  ),
});

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/gu, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    const zero = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - zero);
  });
}

export function getPhoneCountryMismatch(
  phoneInput: string,
  countryCode: string,
) {
  if (!/^[A-Z]{2}$/u.test(countryCode)) return false;

  const phone = parsePhoneNumberFromString(
    normalizeDigits(phoneInput.trim()),
    countryCode as CountryCode,
  );

  return Boolean(
    phone?.isValid() && phone.country && phone.country !== countryCode,
  );
}

function normalizeWebsite(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/iu.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(candidate);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invalid company website");
  }

  return url.toString().replace(/\/$/u, "");
}

export function parseRequestInput(input: unknown, organizationDate: string) {
  const source = requestInputSchema.parse(input);
  const phoneRaw = source.phone.trim();
  const phone = parsePhoneNumberFromString(
    normalizeDigits(phoneRaw),
    source.countryCode as CountryCode,
  );

  if (!phone?.isValid()) {
    throw new Error("Invalid phone number");
  }

  if (source.desiredStartDate && source.desiredStartDate < organizationDate) {
    throw new Error("Desired start date is in the past");
  }

  const isCompany = source.requesterType === "company";
  const companyName = isCompany
    ? collapseWhitespace(source.companyName ?? "")
    : null;

  if (isCompany && !companyName) {
    throw new Error("Company name is required");
  }

  return {
    requesterType: source.requesterType,
    contactName: collapseWhitespace(source.contactName),
    email: source.email.trim().toLowerCase(),
    phoneRaw,
    phoneE164: phone.number,
    countryCode: source.countryCode,
    phoneCountryMismatch: getPhoneCountryMismatch(phoneRaw, source.countryCode),
    serviceCategory: source.serviceCategory,
    requestTitle: source.requestTitle.trim(),
    description: source.description.trim(),
    desiredStartDate: source.desiredStartDate || null,
    preferredContactMethod: source.preferredContactMethod || null,
    submittedLocale: source.submittedLocale,
    consentTextVersion: source.consentTextVersion,
    companyName,
    jobTitle: isCompany
      ? collapseWhitespace(source.jobTitle ?? "") || null
      : null,
    companyWebsite: isCompany ? normalizeWebsite(source.companyWebsite) : null,
  };
}
