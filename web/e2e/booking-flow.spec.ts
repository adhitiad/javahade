import { test, expect } from '@playwright/test';

test.describe('Booking and Payment Flow', () => {
  test('should allow user to book a session and complete payment', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. Navigate to booking
    await page.click('text="Book Session"');
    await expect(page).toHaveURL(/.*\/booking/);

    // 3. Select a slot and proceed to payment
    await page.click('.available-slot:first-child');
    await page.click('button:has-text("Confirm Booking")');

    // 4. Payment page
    await expect(page).toHaveURL(/.*\/payment/);
    await page.click('button:has-text("Pay with Wallet")');

    // 5. Success and redirect to stream
    await expect(page.locator('.payment-success-message')).toBeVisible();
    await page.click('text="Go to Stream"');
    await expect(page).toHaveURL(/.*\/stream/);
  });
});
