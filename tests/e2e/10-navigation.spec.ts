/**
 * Navigation & smoke tests — every route loads without crashing.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/',                      name: 'Dashboard' },
  { path: '/transactions',          name: 'Transactions' },
  { path: '/budgets',               name: 'Budgets' },
  { path: '/goals',                 name: 'Goals' },
  { path: '/chat',                  name: 'Chat' },
  { path: '/learn',                 name: 'Learn' },
  { path: '/tools',                 name: 'Tools' },
  { path: '/calculators/simple-loan',       name: 'Loan Calculator' },
  { path: '/calculators/credit-card',       name: 'Credit Card Calculator' },
  { path: '/calculators/home-affordability',name: 'Home Affordability Calculator' },
  { path: '/calculators/mortgage-payoff',   name: 'Mortgage Payoff Calculator' },
  { path: '/calculators/compound-savings',  name: 'Compound Savings Calculator' },
  { path: '/settings',              name: 'Settings' },
];

for (const route of ROUTES) {
  test(`${route.name} (${route.path}) loads without error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Catch 4xx/5xx responses
    const failedRequests: string[] = [];
    page.on('response', res => {
      if (res.status() >= 400 && res.url().includes(page.url())) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto(route.path);
    await page.waitForLoadState('networkidle');

    // Should not be redirected to an error page
    await expect(page).not.toHaveURL(/\/404|\/500|\/error/);

    // No unhandled JS errors (filter out known benign ones)
    const realErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error promise rejection')
    );
    expect(realErrors, `JS errors on ${route.path}: ${realErrors.join(', ')}`).toHaveLength(0);
  });
}

test.describe('Sidebar navigation', () => {
  test('sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Transactions link
    const txLink = page.getByRole('link', { name: /transactions|المعاملات/i }).first();
    await txLink.click();
    await expect(page).toHaveURL(/\/transactions/);

    // Back to dashboard
    const dashLink = page.getByRole('link', { name: /dashboard|الرئيسية/i }).first();
    await dashLink.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
