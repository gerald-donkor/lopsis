import {defineConfig} from '@playwright/test';

const E2E_PORT = Number(process.env.LOPSIS_E2E_PORT ?? 3111);
const baseURL = process.env.LOPSIS_E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
  },
  webServer: process.env.LOPSIS_E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${E2E_PORT}`,
        url: baseURL,
        // Never attach to a foreign server: :3000 is often another project.
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
