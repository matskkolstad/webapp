import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  reporter: [["html", { open: "never" }]],
  webServer: {
    command: "npm run start -- -p 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
