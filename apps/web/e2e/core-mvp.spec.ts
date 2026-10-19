import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  createLocalStaffAccount,
  type LocalStaffAccount,
  removeLocalTestData,
} from "./local-supabase";

let account: LocalStaffAccount | undefined;
let submittedReference: string | undefined;

test.beforeAll(async () => {
  account = await createLocalStaffAccount();
});

test.afterAll(async () => {
  if (account) {
    await removeLocalTestData(account, submittedReference);
  }
});

test("English entry point has secure headers and keyboard navigation", async ({
  page,
}) => {
  const response = await page.goto("/en");

  expect(response).not.toBeNull();
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("Arabic mobile company request can be reviewed and approved", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/request/opshub-demo-request-form");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("شركة").check();
  await page.getByLabel("اسم جهة الاتصال").fill("  عميل   تجريبي  ");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("PHASE7@EXAMPLE.TEST");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("٠١٠١٢٣٤٥٦٧٨");
  await page.getByLabel("عنوان الطلب").fill("طلب اختبار المرحلة السابعة");
  await page
    .getByLabel("وصف الطلب")
    .fill("هذا طلب تجريبي آمن للتحقق من رحلة العمل الكاملة.");
  await page.getByLabel("اسم الشركة").fill("شركة الاختبار");
  await page
    .getByLabel("الموقع الإلكتروني للشركة (اختياري)")
    .fill("example.com");
  await page.getByLabel(/أوافق على استخدام/).check();

  const formAccessibility = await new AxeBuilder({ page }).analyze();
  expect(formAccessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "إرسال الطلب" }).click();
  await expect(page).toHaveURL(/\/ar\/request\/confirmation\?reference=/u);
  submittedReference = (
    await page.locator(".reference-card strong").textContent()
  )?.trim();
  expect(submittedReference).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/u);

  const signInPageResponse = await page.goto("/en/staff/sign-in");
  expect(signInPageResponse?.headers()["cache-control"]).toContain("no-store");
  if (!account) throw new Error("Synthetic staff account was not created.");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill("incorrect-local-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".auth-error")).toHaveText(
    "The email or password is incorrect.",
  );
  await page.goto("/en/staff/sign-in");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/staff$/u);

  await page.getByLabel("Search requests").fill(submittedReference!);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("link", { name: /طلب اختبار المرحلة السابعة/u }).click();
  await expect(page.getByText("+201012345678", { exact: false })).toBeVisible();
  await expect(
    page.getByText("https://example.com", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start review" }).click();
  await page.getByRole("button", { name: "Approve request" }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect(page.locator(".status-badge")).toHaveText("Approved");
  await expect(
    page.getByText("Delivery job created", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const staffAccessibility = await new AxeBuilder({ page }).analyze();
  expect(staffAccessibility.violations).toEqual([]);
});
