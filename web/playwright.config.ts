import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build on local Supabase (npm run db:start first).
// One worker: tests share the server's render queue, and render timing matters.
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100", trace: "off", screenshot: "only-on-failure", ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60_000,
    env: { RENDER_IN_PROCESS: "1", RENDER_SCALE: "0.5", ALLOW_FAKE_PLANNER: "1" },
  },
});
