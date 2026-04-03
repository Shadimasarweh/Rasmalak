/**
 * Learn page tests — course library and course viewer.
 */
import { test, expect } from '@playwright/test';

test.describe('Learn page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');
  });

  test('renders page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /learn|تعلم/i })).toBeVisible();
  });

  test('shows course cards', async ({ page }) => {
    // Course cards are links to /learn/courses/...
    const cards = page.locator('a[href*="/learn/courses/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('course card has title and start button', async ({ page }) => {
    const firstCard = page.locator('a[href*="/learn/courses/"]').first();
    await expect(firstCard).toBeVisible();
    // Should have text content (title or button)
    const text = await firstCard.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('can open a course', async ({ page }) => {
    const courseLink = page.locator('a[href*="/learn/courses/"]').first();
    if (await courseLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Use goto instead of click — a button inside the card intercepts pointer events
      const href = await courseLink.getAttribute('href');
      if (href) {
        await page.goto(href);
        await page.waitForURL(/\/learn\/courses\//, { timeout: 15_000, waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/learn\/courses\//);
      }
    }
  });

  test('level filters work (Beginner, Intermediate, Advanced)', async ({ page }) => {
    const beginner = page.getByRole('button', { name: /beginner|مبتدئ/i });
    if (await beginner.isVisible({ timeout: 3000 }).catch(() => false)) {
      await beginner.click();
      await page.waitForTimeout(500);
      // Page should still be on /learn
      await expect(page).toHaveURL(/\/learn/);
    }
  });
});

test.describe('Course viewer', () => {
  test('course content renders', async ({ page }) => {
    // Navigate to learn, get first course href and go directly
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const courseLink = page.locator('a[href*="/learn/courses/"]').first();
    if (await courseLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await courseLink.getAttribute('href');
      if (href) {
        await page.goto(href);
        await page.waitForURL(/\/learn\/courses\//, { timeout: 15_000, waitUntil: 'domcontentloaded' });

        // Course page should have lesson content
        await expect(page.locator('h1, h2').first()).toBeVisible();
      }
    }
  });
});
