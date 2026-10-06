/** Isolated local test server. Never imported by the production entrypoint. */
import { serve } from '@hono/node-server';
import { randomUUID } from 'node:crypto';
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
    charges.set(body.reference, { ...body, status: 'abandoned' });
    return Response.json({ status:true, data:{authorization_url:`https://checkout.paystack.com/${body.reference}`} });
  }
  const charge = charges.get(url.split('/').at(-1)!);
  return charge ? Response.json({ status:true, data:charge })
    : Response.json({ status:false, message:'Transaction reference not found' }, { status:404 });
};
app.post('/__test__/reset', async c => {
  await query('TRUNCATE users, otp_codes, phone_entitlements, request_limits CASCADE');
  charges.clear();
  return c.json({ok:true});
});
app.get('/__test__/checkout/:reference', c => {
  const charge = charges.get(c.req.param('reference'));
  const status = c.req.query('status') || 'success';
  if (!['success', 'failed', 'abandoned', 'pending', 'processing'].includes(status)) return c.json({ error:'Unsupported test status' }, 400);
  if (charge) charge.status = status;
  return c.json(charge ? { callback_url:charge.callback_url } : {error:'Unknown checkout'}, charge ? 200 : 404);
});
app.post('/__test__/users/:phone/admin', async c => {
  const { rows } = await query("UPDATE users SET role='admin' WHERE phone=$1 RETURNING id", [c.req.param('phone')]);
  return c.json(rows[0] ? { user:rows[0] } : { error:'Unknown test user' }, rows[0] ? 200 : 404);
});
app.post('/__test__/cotisations/:id/expire', async c => {
  const body = await c.req.json().catch(() => ({}));
  const daysAgo = body.daysAgo ?? 1;
  if (!Number.isInteger(daysAgo) || daysAgo < 1 || daysAgo > 90) return c.json({ error:'Invalid test date' }, 400);
  const { rows } = await query(`UPDATE cotisations SET deadline=CURRENT_DATE-$2::int,
    starts_at=CURRENT_DATE-$2::int-COALESCE(duration_days,35), status='closed',close_reason='expired',edit_version=edit_version+1
    WHERE id::text=$1 RETURNING *`, [c.req.param('id'), daysAgo]);
  return c.json(rows[0] ? { cotisation:rows[0] } : { error:'Unknown test cotisation' }, rows[0] ? 200 : 404);
});
app.post('/__test__/cotisations/:id/review-payment', async c => {
  const { rows: cotisations } = await query('SELECT id,owner_id FROM cotisations WHERE id::text=$1', [c.req.param('id')]);
  const cotisation = cotisations[0];
  if (!cotisation) return c.json({ error:'Unknown test cotisation' }, 404);
  const reference = randomUUID();
  const { rows } = await query(`INSERT INTO platform_payments
    (id,user_id,cotisation_id,purpose,amount,duration_days,status,paystack_reference,application_status,review_reason,paid_at)
    VALUES ($1::uuid,$2,$3,'extend',2000,10,'paid',$1::text,'review_required','extension_expired',now()) RETURNING *`,
    [reference,cotisation.owner_id,cotisation.id]);
  return c.json({ payment:rows[0] },201);
});
serve({ fetch:app.fetch, port:4001, hostname:'127.0.0.1' });
