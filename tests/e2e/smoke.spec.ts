import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/nb/login");
  await expect(page.locator("input#email")).toBeVisible();
  await expect(page.locator("input#password")).toBeVisible();
});
