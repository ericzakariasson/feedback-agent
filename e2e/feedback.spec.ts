import { expect, test } from "@playwright/test";

test("opens a region capture overlay from the widget", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Feedback" });
  await expect(dialog.getByRole("button", { name: "Capture" })).toBeVisible();
  await expect(dialog.getByText("Capture a region, or upload / paste a screenshot.")).toBeVisible();
  await dialog.getByRole("button", { name: "Capture" }).click();
  await expect(page.locator("#__fw_region_root")).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(page.locator("#__fw_region_root")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Capture" })).toBeVisible();
});

test("submits dry-run feedback from the local example", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Local dry-run");
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page
    .getByPlaceholder("Describe a bug or idea. What did you expect to happen?")
    .fill("Saving the plan crashes after I click Save.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("We saved this report locally")).toBeVisible();
  await expect(page.getByText(/Reference:/)).toBeVisible();
});
