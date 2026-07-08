/**
 * Dashboard tests — main overview page.
 */
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders greeting and financial overview', async ({ page }) => {
    // Greeting heading exists
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // "Add Transaction" button
    await expect(page.getByRole('link', { name: /add transaction/i })).toBeVisible();
  });

  test('shows monthly summary card', async ({ page }) => {
    await expect(page.locator('text=/monthly summary|الملخص الشهري/i')).toBeVisible();
    await expect(page.locator('text=/net cash flow|صافي التدفق/i')).toBeVisible();
  });

  test('shows budget usage card', async ({ page }) => {
    await expect(page.locator('text=/budget usage|استخدام الميزانية/i')).toBeVisible();
  });

  test('shows total balance card', async ({ page }) => {
    await expect(page.locator('text=/total balance|الرصيد الإجمالي/i')).toBeVisible();
  });

  test('View Transactions link works', async ({ page }) => {
    await page.getByRole('link', { name: /view transactions/i }).first().click();
    await expect(page).toHaveURL(/\/transactions/);
  });

  test('Add Transaction button navigates correctly', async ({ page }) => {
    await page.getByRole('link', { name: /add transaction/i }).click();
    await expect(page).toHaveURL(/\/transactions/);
  });

  test('no JS console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  // Predictive surfaces are live (AI_FEATURES flags on) but data-gated:
  // each card renders only past ≥28 days / ≥10 transactions of history
  // (Safe-to-Spend also needs a detected salary), so a fresh account may
  // legitimately show none. Pin only the unconditional invariant: the
  // classic hero survives alongside whatever predictive cards appear.
  test('dashboard hero renders with predictive flags on', async ({ page }) => {
    await expect(page.locator('text=/total balance|الرصيد الإجمالي/i')).toBeVisible();
  });
});
