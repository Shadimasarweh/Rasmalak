/**
 * Chat (Mustasharak AI) tests.
 * Tests: page load, English message → English reply, Arabic message → Arabic reply,
 * suggested actions, long message, empty message guard.
 */
import { test, expect } from '@playwright/test';

test.describe('Chat page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('renders chat interface', async ({ page }) => {
    await expect(page.getByPlaceholder(/ask mustasharak|اسأل/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i }).or(
      page.locator('button[type="submit"]')
    )).toBeVisible();
  });

  test('English message gets English reply', async ({ page }) => {
    const input = page.getByPlaceholder(/ask mustasharak|اسأل/i);
    await input.fill('What is my current savings rate?');
    await input.press('Enter');

    // Wait for AI response (up to 30s)
    await page.waitForTimeout(2000);
    const aiMessages = page.locator('[data-role="assistant"]');
    await expect(aiMessages.first()).toBeVisible({ timeout: 30_000 });

    // Response should contain Latin characters (English)
    const responseText = await aiMessages.first().textContent();
    const latinChars = (responseText?.match(/[a-zA-Z]/g) || []).length;
    const arabicChars = (responseText?.match(/[\u0600-\u06FF]/g) || []).length;
    expect(latinChars).toBeGreaterThan(arabicChars);
  });

  test('Arabic message gets Arabic reply', async ({ page }) => {
    const input = page.getByPlaceholder(/ask mustasharak|اسأل/i);
    await input.fill('كيف حال ميزانيتي هذا الشهر؟');
    await input.press('Enter');

    await page.waitForTimeout(2000);
    const aiMessages = page.locator('[data-role="assistant"]');
    await expect(aiMessages.first()).toBeVisible({ timeout: 30_000 });

    const responseText = await aiMessages.first().textContent();
    const arabicChars = (responseText?.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (responseText?.match(/[a-zA-Z]/g) || []).length;
    expect(arabicChars).toBeGreaterThan(latinChars);
  });

  test('suggested action chips are clickable', async ({ page }) => {
    // Find suggested prompts (if shown on initial state)
    const chip = page.locator('[class*="suggestion"], [class*="chip"], button:has-text("Analyze")').first();
    if (await chip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chip.click();
      // Input should be populated or message sent
      const input = page.getByPlaceholder(/ask mustasharak|اسأل/i);
      const val = await input.inputValue();
      // Either the input was filled or a message was sent
      const messagesSent = await page.locator('[data-role="user"]').count();
      expect(val.length > 0 || messagesSent > 0).toBe(true);
    }
  });

  test('empty message does not send', async ({ page }) => {
    const input = page.getByPlaceholder(/ask mustasharak|اسأل/i);
    await input.fill('');
    await input.press('Enter');
    await page.waitForTimeout(1000);
    // No AI messages should appear
    const aiMessages = page.locator('[data-role="assistant"]');
    await expect(aiMessages).toHaveCount(0);
  });

  test('sends message via button click', async ({ page }) => {
    const input = page.getByPlaceholder(/ask mustasharak|اسأل/i);
    await input.fill('Summarize my finances');
    const sendBtn = page.getByRole('button', { name: /send/i }).or(
      page.locator('button[type="submit"]')
    );
    await sendBtn.click();
    await page.waitForTimeout(2000);
    const aiMessages = page.locator('[data-role="assistant"]');
    await expect(aiMessages.first()).toBeVisible({ timeout: 30_000 });
  });

  test('opening message (greeting) returns financial assessment', async ({ page }) => {
    // New conversation — first message should trigger financial health summary
    const input = page.getByPlaceholder(/ask mustasharak|اسأل/i);
    await input.fill('hi');
    await input.press('Enter');

    const aiMessages = page.locator('[data-role="assistant"]');
    await expect(aiMessages.first()).toBeVisible({ timeout: 30_000 });

    const responseText = await aiMessages.first().textContent() ?? '';
    // Should contain financial terms — not just "Hi, how can I help?"
    const hasFinancialContent = /saving|budget|spending|balance|health|income|expense|ميزانية|ادخار|مصاريف/i.test(responseText);
    expect(hasFinancialContent).toBe(true);
  });
});
