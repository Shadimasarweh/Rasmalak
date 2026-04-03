import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test.local' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,       // sequential — auth state carries across tests
  forbidOnly: !!process.env.CI,
  retries: 1,
  timeout: 60_000,
  reporter: [
    ['html', { outputFolder: 'tests/report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // Auth setup runs first, saves session to file
    { name: 'setup', testMatch: '**/auth.setup.ts' },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/session.json',
      },
      dependencies: ['setup'],
    },
  ],
});
