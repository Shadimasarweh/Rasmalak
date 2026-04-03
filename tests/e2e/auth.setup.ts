/**
 * Auth setup — runs once before all tests.
 * Logs in and saves the session to disk so every test starts authenticated.
 */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const SESSION_FILE = path.join(__dirname, '../.auth/session.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_EMAIL and TEST_PASSWORD must be set in .env.test.local'
    );
  }

  // Force English so all test selectors use English text
  await page.addInitScript(() => {
    localStorage.setItem('rasmalak-storage', JSON.stringify({ state: { language: 'en', theme: 'light' } }));
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait until we leave /login (client-side navigation via router.push)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000, waitUntil: 'domcontentloaded' });

  await page.context().storageState({ path: SESSION_FILE });
});
