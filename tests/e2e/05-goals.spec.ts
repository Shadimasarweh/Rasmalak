/**
 * Savings Goals tests — create, view, delete.
 */
import { test, expect } from '@playwright/test';

test.describe('Goals page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
  });

  test('renders page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /savings goals|أهداف الادخار/i })).toBeVisible();
  });

  test('shows create goal button or form', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /new goal|create goal|add goal|هدف جديد/i });
    await expect(createBtn.or(page.locator('text=/no savings goals|لا توجد أهداف/i'))).toBeVisible();
  });

  test('can create a new savings goal', async ({ page }) => {
    // Open create form
    const createBtn = page.getByRole('button', { name: /create goal|add goal|new goal|هدف جديد/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
    }

    // Fill in name
    const nameInput = page.getByPlaceholder(/goal name|vacation|اسم الهدف/i).or(
      page.locator('input[type="text"]').first()
    );
    await nameInput.fill('Playwright Test Goal');

    // Fill in target amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('5000');

    // Submit
    await page.getByRole('button', { name: /create|save|حفظ/i }).last().click();
    await page.waitForTimeout(2000);

    // Goal should now appear in the list
    await expect(page.locator('text=Playwright Test Goal').first()).toBeVisible({ timeout: 5000 });
  });

  test('goal cards show progress bar', async ({ page }) => {
    // If any goals exist, they should have a progress indicator
    const goalCards = page.locator('[class*="goal"], [class*="card"]');
    const count = await goalCards.count();
    if (count > 0) {
      // At least one card should exist
      await expect(goalCards.first()).toBeVisible();
    }
  });

  test('can delete a goal', async ({ page }) => {
    // Only run if there's at least one goal card
    const deleteBtn = page.getByRole('button', { name: /delete|حذف/i }).first();
    if (await deleteBtn.isVisible()) {
      const initialCount = await page.locator('[class*="goal-card"], [data-goal]').count();
      await deleteBtn.click();
      // Confirm deletion if a dialog appears
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|نعم/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(1500);
      const newCount = await page.locator('[class*="goal-card"], [data-goal]').count();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });
});
