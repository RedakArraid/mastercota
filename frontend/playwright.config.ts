import { defineConfig, devices } from '@playwright/test';
const database = process.env.TEST_DATABASE_URL || 'postgresql://mastercota_test:mastercota_local_test@127.0.0.1:55432/mastercota_test';
export default defineConfig({
  testDir:'./tests', workers:1, fullyParallel:false, timeout:90_000,
  expect:{timeout:15_000},
  use:{ baseURL:'http://localhost:3100', trace:'retain-on-failure', screenshot:'only-on-failure' },
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:[
    {command:'node --import tsx scripts/e2e-server.ts',cwd:'../backend',url:'http://127.0.0.1:4001/health',reuseExistingServer:false,env:{TEST_DATABASE_URL:database},timeout:30_000},
    {command:'npm run dev -- --port 3100',url:'http://localhost:3100',reuseExistingServer:false,env:{NEXT_DIST_DIR:'.next-e2e',BACKEND_URL:'http://127.0.0.1:4001',NEXT_PUBLIC_APP_URL:'http://localhost:3100',JWT_SECRET:'mastercota-e2e-local-secret-at-least-32-characters'},timeout:120_000},
  ],
});
