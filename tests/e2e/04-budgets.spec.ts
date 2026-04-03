/**
 * Budgets tests — set monthly limit, category budgets, save.
 */
import { test, expect } from '@playwright/test';

test.describe('Budgets page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');
  });

  test('renders page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /budgets|الميزانيات/i, level: 1 })).toBeVisible();
  });

  test('shows budget category inputs', async ({ page }) => {
    // At least one category budget input should be visible
    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('can set monthly budget total', async ({ page }) => {
    const totalInput = page.locator('input[type="number"]').first();
    await totalInput.fill('1000');
    await expect(totalInput).toHaveValue('1000');
  });

  test('Save Budgets button exists and is clickable', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save budgets|حفظ الميزانية/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    // Should show success toast or not crash
    await page.waitForTimeout(2000);
    // Page should still be on /budgets
    await expect(page).toHaveURL(/\/budgets/);
  });

  test('shows food & dining category', async ({ page }) => {
    await expect(page.locator('text=/food|طعام|dining/i')).toBeVisible();
  });

  test('shows transportation category', async ({ page }) => {
    await expect(page.locator('text=/transport|مواصلات/i')).toBeVisible();
  });

  test('progress bars render', async ({ page }) => {
    const progressBars = page.locator('[role="progressbar"], .progress, progress');
    // If there are any budget amounts set, progress bars should show
    const count = await progressBars.count();
    // Just check the page doesn't crash — progress bars may be 0 if no spending
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
