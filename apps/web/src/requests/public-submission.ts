import { createHmac } from "node:crypto";

export function classifyPublicFormLookup(
  data: unknown,
  error: unknown,
): "available" | "not-found" | "service-unavailable" {
  if (error) {
    return "service-unavailable";
  }

  return data ? "available" : "not-found";
}

export function getOrganizationDate(
  timezone: string,
  now = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function createSubmissionSubjectHash(
  publicFormId: string,
  networkSubject: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${publicFormId}:${networkSubject}`)
    .digest("hex");
}
