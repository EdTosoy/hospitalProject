import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.includes("test")
)
  throw new Error(
    "Browser tests require a dedicated database with test in its name",
  );
export default defineConfig({
  testDir: "./test",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: "pnpm --filter backend db:seed && pnpm --filter backend prod",
      cwd: resolve(__dirname, "../.."),
      url: "http://localhost:3000/health",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        JWT_SECRET: "browser-test-secret-at-least-32-characters",
        PORT: "3000",
        CORS_ORIGIN: "http://localhost:3001",
        SEED_PASSWORD: "browser-test-password",
        NODE_ENV: "development",
      },
    },
    {
      command: "pnpm --filter frontend start",
      cwd: resolve(__dirname, "../.."),
      url: "http://localhost:3001",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
