import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveTitle(/AI Coach Dashboard/);
});

test('login button exists', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  const loginButton = page.getByRole('button', { name: /Connect with Strava/i });
  await expect(loginButton).toBeVisible();
});
