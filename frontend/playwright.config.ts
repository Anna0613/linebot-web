import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:5187";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  use: { baseURL, serviceWorkers: "block" },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 5187 --strictPort",
    url: baseURL,
    env: { VITE_PG_INBOX: "true", VITE_UNIFIED_API_URL: baseURL },
  },
});
