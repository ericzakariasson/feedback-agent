import { expect, test } from "@playwright/test";

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
