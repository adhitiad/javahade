import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Javahade/);
});

test('can navigate to login page', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  await page.getByRole('button', { name: /Masuk/i }).click();

  // Expects page to have a heading with the name of Login/Masuk.
  await expect(page.getByRole('heading', { name: /Masuk ke Javahade/i })).toBeVisible();
});
