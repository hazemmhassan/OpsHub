import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.skip(
  process.env.AI_INTAKE_ENABLED !== "true",
  "Run only when the private mock AI service is explicitly enabled.",
);

test("optional AI intake works in English and Arabic without replacing the form", async ({
  page,
}) => {
  await page.goto("/en/request/opshub-demo-request-form");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  const openEnglish = page.getByRole("button", { name: "Use the assistant" });
  await openEnglish.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/external AI provider/u)).toBeVisible();
  await page
    .getByLabel("Message to assistant")
    .fill(
      "We need a support and maintenance portal for recurring customer issues.",
    );
  await page.getByRole("button", { name: "Ask assistant" }).click();
  await expect(
    page.getByText("What is the main outcome you want to achieve?"),
  ).toBeVisible();
  await expect(page.getByLabel("Service category")).toHaveValue(
    "support_maintenance",
  );
  await expect(page.getByLabel("Request title")).toHaveValue(
    "Support and maintenance portal for recurring customer issues",
  );
  await expect(page.getByLabel("Description")).toHaveValue(
    "We need a support and maintenance portal for recurring customer issues.",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/request/opshub-demo-request-form");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "استخدام المساعد" }).click();
  await page
    .getByLabel("رسالة إلى المساعد")
    .fill("هل تقدمون تدريباً عملياً للفريق؟");
  await page.getByRole("button", { name: "اسأل المساعد" }).click();
  await expect(page.getByText("المصدر:", { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
