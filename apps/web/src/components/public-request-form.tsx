"use client";

import { useState } from "react";

import countries from "i18n-iso-countries";
import arCountries from "i18n-iso-countries/langs/ar.json";
import enCountries from "i18n-iso-countries/langs/en.json";

import type { AppLocale } from "@/i18n/locale";
import { parseRequestInput } from "@/requests/request-input";

countries.registerLocale(arCountries);
countries.registerLocale(enCountries);

type PublicRequestFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  consentVersion: string;
  locale: AppLocale;
  organizationDate: string;
  publicId: string;
  serverError?: string | null;
};

const text = {
  en: {
    title: "Tell us what you need",
    intro: "Share the essentials and the team will contact you directly.",
    individual: "Individual",
    company: "Company",
    contact: "Contact name",
    email: "Email",
    phone: "Phone",
    country: "Country",
    category: "Service category",
    requestTitle: "Request title",
    description: "Description",
    sensitive:
      "Do not include passwords, payment details, or other sensitive data.",
    date: "Desired start date",
    method: "Preferred contact method",
    companyName: "Company name",
    jobTitle: "Job title (optional)",
    website: "Company website (optional)",
    consent:
      "I agree that the team may use these details to respond to my request.",
    submit: "Send request",
    invalid: "Please review the highlighted information and try again.",
  },
  ar: {
    title: "أخبرنا بما تحتاج إليه",
    intro: "شارك التفاصيل الأساسية وسيتواصل معك الفريق مباشرة.",
    individual: "فرد",
    company: "شركة",
    contact: "اسم جهة الاتصال",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    country: "الدولة",
    category: "فئة الخدمة",
    requestTitle: "عنوان الطلب",
    description: "وصف الطلب",
    sensitive: "لا تذكر كلمات مرور أو بيانات دفع أو معلومات حساسة أخرى.",
    date: "تاريخ البدء المطلوب",
    method: "طريقة التواصل المفضلة",
    companyName: "اسم الشركة",
    jobTitle: "المسمى الوظيفي (اختياري)",
    website: "الموقع الإلكتروني للشركة (اختياري)",
    consent: "أوافق على استخدام هذه البيانات للرد على طلبي.",
    submit: "إرسال الطلب",
    invalid: "راجع البيانات وحاول مرة أخرى.",
  },
} as const;

const categoryOptions = [
  ["consulting", "Consulting", "استشارات"],
  ["it_software", "IT and software", "تقنية المعلومات والبرمجيات"],
  ["marketing", "Marketing", "تسويق"],
  ["training", "Training", "تدريب"],
  ["support_maintenance", "Support and maintenance", "دعم وصيانة"],
  ["other", "Other", "أخرى"],
] as const;

export function PublicRequestForm({
  action,
  consentVersion,
  locale,
  organizationDate,
  publicId,
  serverError,
}: PublicRequestFormProps) {
  const copy = text[locale];
  const [requesterType, setRequesterType] = useState<"individual" | "company">(
    "individual",
  );
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const names = countries.getNames(locale, { select: "official" });
  const priority = new Map(
    ["EG", "SA", "AE"].map((code, index) => [code, index]),
  );
  const countryOptions = Object.entries(names).toSorted(
    ([codeA, nameA], [codeB, nameB]) => {
      const rankA = priority.get(codeA) ?? 99;
      const rankB = priority.get(codeB) ?? 99;
      return rankA - rankB || nameA.localeCompare(nameB, locale);
    },
  );

  function validate(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    try {
      parseRequestInput(
        {
          requesterType: data.get("requesterType"),
          contactName: data.get("contactName"),
          email: data.get("email"),
          phone: data.get("phone"),
          countryCode: data.get("countryCode"),
          serviceCategory: data.get("serviceCategory"),
          requestTitle: data.get("requestTitle"),
          description: data.get("description"),
          desiredStartDate: data.get("desiredStartDate"),
          preferredContactMethod: data.get("preferredContactMethod"),
          submittedLocale: locale,
          consentTextVersion: consentVersion,
          consent: data.get("consent") === "on",
          companyName: data.get("companyName"),
          jobTitle: data.get("jobTitle"),
          companyWebsite: data.get("companyWebsite"),
        },
        organizationDate,
      );
      setError(null);
    } catch {
      event.preventDefault();
      setError(copy.invalid);
    }
  }

  return (
    <main className="request-form-shell">
      <form action={action} className="request-form" onSubmit={validate}>
        <header>
          <p className="eyebrow">OpsHub</p>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </header>
        {error || serverError ? (
          <p role="alert" className="form-error">
            {error ?? serverError}
          </p>
        ) : null}
        <input name="publicId" type="hidden" value={publicId} />
        <input name="locale" type="hidden" value={locale} />
        <input name="consentTextVersion" type="hidden" value={consentVersion} />
        <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
        <input
          name="website"
          className="honeypot"
          tabIndex={-1}
          autoComplete="off"
        />
        <fieldset>
          <legend>
            {copy.individual} / {copy.company}
          </legend>
          <label>
            <input
              checked={requesterType === "individual"}
              name="requesterType"
              onChange={() => setRequesterType("individual")}
              type="radio"
              value="individual"
            />{" "}
            {copy.individual}
          </label>
          <label>
            <input
              checked={requesterType === "company"}
              name="requesterType"
              onChange={() => setRequesterType("company")}
              type="radio"
              value="company"
            />{" "}
            {copy.company}
          </label>
        </fieldset>
        <label>
          {copy.contact}
          <input name="contactName" required maxLength={120} />
        </label>
        <label>
          {copy.email}
          <input name="email" type="email" required maxLength={254} dir="ltr" />
        </label>
        <label>
          {copy.phone}
          <input name="phone" type="tel" required maxLength={64} dir="ltr" />
        </label>
        <label>
          {copy.country}
          <select name="countryCode" required defaultValue="EG">
            {countryOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.category}
          <select name="serviceCategory" required defaultValue="consulting">
            {categoryOptions.map(([value, en, ar]) => (
              <option key={value} value={value}>
                {locale === "ar" ? ar : en}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.requestTitle}
          <input name="requestTitle" required minLength={5} maxLength={120} />
        </label>
        <label htmlFor="request-description">{copy.description}</label>
        <textarea
          id="request-description"
          name="description"
          required
          minLength={20}
          maxLength={2000}
        />
        <small>{copy.sensitive}</small>
        <label>
          {copy.date}
          <input name="desiredStartDate" type="date" min={organizationDate} />
        </label>
        <label>
          {copy.method}
          <select name="preferredContactMethod" defaultValue="">
            <option value="">{copy.email}</option>
            <option value="email">{copy.email}</option>
            <option value="phone">{copy.phone}</option>
          </select>
        </label>
        {requesterType === "company" ? (
          <div className="company-fields">
            <label>
              {copy.companyName}
              <input name="companyName" required maxLength={160} />
            </label>
            <label>
              {copy.jobTitle}
              <input name="jobTitle" maxLength={120} />
            </label>
            <label>
              {copy.website}
              <input name="companyWebsite" maxLength={2048} dir="ltr" />
            </label>
          </div>
        ) : null}
        <label className="consent">
          <input name="consent" type="checkbox" required /> {copy.consent}
        </label>
        <button className="primary-action" type="submit">
          {copy.submit}
        </button>
      </form>
    </main>
  );
}
