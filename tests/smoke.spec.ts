import { expect, test } from "@playwright/test";

test.describe("Store smoke", () => {
  test("landing page is English Digital Legacy", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Digital Legacy/i);
    await expect(page.getByRole("link").first()).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(20);
  });

  test("login route loads unlock UI", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type=password]").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("legacy Turkish login redirects to /login", async ({ page }) => {
    await page.goto("/giris");
    await expect(page).toHaveURL(/\/login/);
  });

  test("privacy page is public English", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText(/Privacy/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("legacy settings path redirects to English route", async ({ page }) => {
    const res = await page.goto("/panel/ayarlar", {
      waitUntil: "domcontentloaded",
    });
    // May land on login if locked, but URL should not stay on Turkish segment
    expect(page.url()).not.toMatch(/ayarlar/);
    expect(res?.status() ?? 200).toBeLessThan(500);
  });
});
