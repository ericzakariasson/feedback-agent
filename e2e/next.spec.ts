import { expect, test } from "@playwright/test";

test("signs in and submits dry-run feedback from the Next example", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Signed in. Session capture is on.")).toBeVisible();

  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page
    .getByPlaceholder("Describe a bug or idea. What did you expect to happen?")
    .fill("Saving the plan crashes after I click Save.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("We saved this report locally")).toBeVisible();
  await expect(page.getByText(/Reference:/)).toBeVisible();
});
