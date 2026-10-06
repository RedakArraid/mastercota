import { serve } from '@hono/node-server';
import { app, autoCloseExpiredCotisations } from './index.js';
import { pool } from './lib/db.js';
import { validateEnvironment } from './lib/security.js';
validateEnvironment();
await pool.query('SELECT 1 FROM request_limits LIMIT 1');
const maintain = () => autoCloseExpiredCotisations().catch(error => console.error('[maintenance]', error.message));
await maintain();
const timer = setInterval(maintain, 60_000);
const server = serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 4000) });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  clearInterval(timer);
  server.close(() => { void pool.end().then(() => process.exit(0)); });
});
