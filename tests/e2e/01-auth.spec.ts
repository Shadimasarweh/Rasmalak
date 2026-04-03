/**
 * Auth flow tests (unauthenticated — no stored session used here).
 * Tests: login page UI, forgot password, signup form validation, redirect guard.
 */
import { test, expect } from '@playwright/test';

// These tests run without the saved session
test.use({ storageState: { cookies: [], origins: [] } });

// Force English so selectors match English text (default locale is Arabic)
const forceEnglish = async ({ page }: { page: import('@playwright/test').Page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rasmalak-storage', JSON.stringify({ state: { language: 'en', theme: 'light' } }));
  });
};

test.describe('Login page', () => {
  test.beforeEach(forceEnglish);

  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('name@example.com').fill('bad@example.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();
    // Error message should appear
    await expect(page.locator('text=/invalid|incorrect|wrong|error/i')).toBeVisible({ timeout: 8000 });
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByPlaceholder('Enter your password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    // Click the eye icon toggle
    await page.locator('button[aria-label*="password"], button:near(input[type="password"])').first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('redirect to dashboard after login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('name@example.com').fill(process.env.TEST_EMAIL!);
    await page.getByPlaceholder('Enter your password').fill(process.env.TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('Signup page', () => {
  test.beforeEach(forceEnglish);

  test('renders signup form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /get started/i })).toBeVisible();
    await expect(page.getByPlaceholder(/amir al-masri/i)).toBeVisible();
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /create my account/i })).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder(/amir al-masri/i).fill('Test User');
    await page.getByPlaceholder('name@example.com').fill('test@example.com');
    await page.getByPlaceholder('••••••••').fill('abc');
    await page.getByRole('button', { name: /create my account/i }).click();
    await expect(page.locator('text=/password|كلمة المرور/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('has link back to login', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
});

test.describe('Forgot password page', () => {
  test.beforeEach(forceEnglish);

  test('renders form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });

  test('shows success state after submitting email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('textbox').fill('any@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    // Should show success message (same regardless of whether email exists)
    await expect(page.locator('text=/check your email|تحقق من بريدك/i')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Auth guard', () => {
  test.beforeEach(forceEnglish);

  // NOTE: These tests only pass against a production build.
  // In development (npm run dev), DEV_BYPASS_AUTH=true skips the auth redirect.
  test('redirects unauthenticated users from dashboard to login', async ({ page }) => {
    test.skip(process.env.NODE_ENV !== 'production', 'Auth bypass is enabled in dev mode');
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated users from /chat to login', async ({ page }) => {
    test.skip(process.env.NODE_ENV !== 'production', 'Auth bypass is enabled in dev mode');
    await page.goto('/chat');
    await page.waitForURL(/\/login/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
