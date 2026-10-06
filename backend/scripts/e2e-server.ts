/** Isolated local test server. Never imported by the production entrypoint. */
import { serve } from '@hono/node-server';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('/mastercota_test')) throw new Error('Isolated TEST_DATABASE_URL required');
if (process.env.NODE_ENV === 'production') throw new Error('Test server cannot run in production');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'mastercota-e2e-local-secret-at-least-32-characters';
process.env.OTP_DEV_CODE = '123456';
process.env.OPENWA_ENABLED = 'false';
process.env.OPENWA_API_KEY = '';
process.env.APP_URL = 'http://localhost:3100';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_local_stub';
const { app } = await import('../src/index.js');
const { query } = await import('../src/lib/db.js');
const charges = new Map<string, Record<string, unknown>>();
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith('https://api.paystack.co/')) throw new Error('External requests disabled in E2E');
  if (url.endsWith('/initialize')) {
    const body = JSON.parse(String(init?.body));
    charges.set(body.reference, { ...body, status: 'success' });
    return Response.json({ status:true, data:{authorization_url:`https://checkout.paystack.com/${body.reference}`} });
  }
  return Response.json({ status:true, data:charges.get(url.split('/').at(-1)!) });
};
app.post('/__test__/reset', async c => {
  await query('TRUNCATE users, otp_codes, phone_entitlements, request_limits CASCADE');
  charges.clear();
  return c.json({ok:true});
});
app.get('/__test__/checkout/:reference', c => {
  const charge = charges.get(c.req.param('reference'));
  return c.json(charge ? { callback_url:charge.callback_url } : {error:'Unknown checkout'}, charge ? 200 : 404);
});
serve({ fetch:app.fetch, port:4001, hostname:'127.0.0.1' });
