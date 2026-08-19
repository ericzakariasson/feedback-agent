import { expect, test } from "@playwright/test";

test("submits dry-run feedback from the Acme demo", async ({ page }) => {
  await page.goto("/invoices");
  await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page
    .getByPlaceholder("Describe a bug or idea. What did you expect to happen?")
    .fill("Renaming an invoice reverts when I click away.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
});

test("control panel can stage the thanks view", async ({ page }) => {
  await page.goto("/invoices");
  await page.getByRole("button", { name: "Open widget stages" }).click();
  await page.getByRole("radio", { name: "Thanks" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
});
