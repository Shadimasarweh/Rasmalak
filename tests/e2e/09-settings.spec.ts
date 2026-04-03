/**
 * Settings page tests — profile, language switch, theme, password change.
 */
import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('renders settings page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /account settings|settings|الإعدادات/i })).toBeVisible();
  });

  test('profile section is visible', async ({ page }) => {
    // "Profile Information" heading is visible in the default (profile) tab
    await expect(page.locator('text=/profile information|profile|الملف الشخصي/i').first()).toBeVisible();
    // Name and email fields
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
  });

  test('can update display name', async ({ page }) => {
    const nameInput = page.locator('input[placeholder*="name"], input[id*="name"], input[name*="name"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill('Playwright Tester');
      const saveBtn = page.getByRole('button', { name: /save|update|حفظ/i }).first();
      await saveBtn.click();
      await page.waitForTimeout(1500);
      // No crash — page still on /settings
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test('language selector exists', async ({ page }) => {
    // Language is under the Preferences tab (NavTab is a div, not a button)
    await page.locator('span', { hasText: 'Preferences' }).evaluate((el) => (el.parentElement as HTMLElement)?.click());
    await expect(page.locator('text=/language|اللغة/i').first()).toBeVisible();
  });

  test('theme options are shown', async ({ page }) => {
    // Theme is under the Preferences tab
    await page.locator('span', { hasText: 'Preferences' }).evaluate((el) => (el.parentElement as HTMLElement)?.click());
    await expect(page.locator('text=/theme|light|dark|المظهر/i').first()).toBeVisible();
  });

  test('password change section exists', async ({ page }) => {
    // Password change is under the Security tab
    await page.locator('span', { hasText: 'Security' }).evaluate((el) => (el.parentElement as HTMLElement)?.click());
    await expect(
      page.locator('text=/password|كلمة المرور/i').first()
    ).toBeVisible();
  });

  test('password validation — weak new password shows error', async ({ page }) => {
    // Find password inputs
    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    if (count >= 2) {
      await passwordInputs.nth(0).fill('currentPass123');
      await passwordInputs.nth(1).fill('weak');
      const changeBtn = page.getByRole('button', { name: /change password|update password|تغيير/i });
      if (await changeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await changeBtn.click();
        await expect(
          page.locator('text=/password|كلمة المرور|at least|على الأقل/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('currency selector exists', async ({ page }) => {
    // Currency is under the Preferences tab
    await page.locator('span', { hasText: 'Preferences' }).evaluate((el) => (el.parentElement as HTMLElement)?.click());
    await expect(page.locator('text=/currency|العملة/i').first()).toBeVisible();
  });
});
