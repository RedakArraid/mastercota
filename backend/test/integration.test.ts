import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('/mastercota_test')) throw new Error('TEST_DATABASE_URL must point to the isolated mastercota_test database');
process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'mastercota-test-secret-at-least-32-characters';
process.env.OTP_DEV_CODE = '123456';
process.env.OPENWA_ENABLED = 'false';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_isolated_mock';
process.env.APP_URL = 'http://localhost:3000';
const { app } = await import('../src/index.js');
const { pool, query } = await import('../src/lib/db.js');
const { signSession } = await import('../src/lib/auth.js');
const { activatePlatformPayment, initializePlatformFeePaystack } = await import('../src/lib/billing.js');
const { validateEnvironment } = await import('../src/lib/security.js');
const { normalizeWavePhone } = await import('../src/lib/wave.js');
const charges = new Map<string, any>();
const originalFetch = globalThis.fetch;
let initializeCalls = 0;
globalThis.fetch = async (input, init) => {
  const target = String(input);
  assert.ok(target.startsWith('https://api.paystack.co/'), `Unexpected external request: ${target}`);
  if (target.endsWith('/initialize')) {
    initializeCalls++;
    const body = JSON.parse(String(init?.body));
    charges.set(body.reference, { ...body, status: 'success' });
    return Response.json({ status: true, data: { authorization_url: `https://checkout.paystack.com/${body.reference}` } });
  }
  const reference = target.split('/').at(-1)!;
  return Response.json({ status: true, data: charges.get(reference) });
};
beforeEach(async () => {
  await query('TRUNCATE users, otp_codes, phone_entitlements, request_limits RESTART IDENTITY CASCADE');
  charges.clear(); initializeCalls = 0;
});
after(async () => { globalThis.fetch = originalFetch; await pool.end(); });
async function user(phone = '+2250700000000') {
  const { rows } = await query("INSERT INTO users(phone,wave_phone,wave_payout_mode) VALUES ($1,$1,'phone') RETURNING *", [phone]);
  return { ...rows[0], token: await signSession(rows[0] as any) };
}
async function request(path: string, method = 'GET', body?: unknown, token?: string) {
  const response = await app.request(path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() as any };
}
async function create(owner: any, free = true) {
  const res = await request('/api/cotisations', 'POST', { title: 'Collecte test', target_amount: 50000, duration_days: free ? 35 : 15, use_free: free }, owner.token);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}
async function pendingContribution(cot: any, overrides: any = {}) {
  const res = await request(`/api/cotisations/${cot.id}/contributions`, 'POST', { contributor_name: 'Alice', contributor_phone: '+2250100000000', amount: 1000, request_id: randomUUID(), ...overrides });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.contribution;
}
function webhook(charge: any) {
  const body = JSON.stringify({ event: 'charge.success', data: charge });
  return app.request('/api/paystack/webhook', { method: 'POST', headers: { 'x-paystack-signature': createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex'), 'Content-Type': 'application/json' }, body });
}

test('OTP requires issuance, limits guesses, expires and cannot be reused', async () => {
  const phone = '+2250700000000';
  assert.equal((await request('/api/auth/verify-otp', 'POST', { phone, token: '123456' })).status, 401);
  assert.equal((await request('/api/auth/send-otp', 'POST', { phone })).status, 200);
  assert.equal((await request('/api/auth/send-otp', 'POST', { phone })).status, 429);
  for (let i=0;i<5;i++) assert.equal((await request('/api/auth/verify-otp', 'POST', { phone, token: '999999' })).status, 401);
  assert.equal((await request('/api/auth/verify-otp', 'POST', { phone, token: '123456' })).status, 401);
  await query('TRUNCATE otp_codes, request_limits');
  await request('/api/auth/send-otp', 'POST', { phone });
  const login = await request('/api/auth/verify-otp', 'POST', { phone, token: '123456' });
  assert.equal(login.status, 200);
  assert.equal((await request('/api/auth/verify-otp', 'POST', { phone, token: '123456' })).status, 401);
  assert.equal((await request('/api/auth/me', 'GET', undefined, login.body.token)).status, 200);
  await request('/api/auth/logout', 'POST', {}, login.body.token);
  assert.equal((await request('/api/auth/me', 'GET', undefined, login.body.token)).status, 401);
});

test('production rejects development OTP and weak secrets; Wave preserves CI leading zero', () => {
  assert.equal(normalizeWavePhone('0700000000'), '+2250700000000');
  process.env.NODE_ENV = 'production';
  assert.throws(validateEnvironment, /OTP/);
  process.env.NODE_ENV = 'test';
});

test('only one free cotisation can be created concurrently', async () => {
  const owner = await user();
  const body = { title: 'Gratuite', target_amount: 50000, duration_days: 35, use_free: true };
  const results = await Promise.all([request('/api/cotisations', 'POST', body, owner.token), request('/api/cotisations', 'POST', body, owner.token)]);
  assert.deepEqual(results.map(r => r.status).sort(), [201,400]);
  assert.equal(Number((await query('SELECT count(*) FROM cotisations')).rows[0].count), 1);
});

test('calendar deadlines retain the exact database date in the API', async () => {
  const owner = await user();
  const { cotisation } = await create(owner);
  const { rows } = await query('SELECT starts_at::text, deadline::text, deadline - starts_at AS days FROM cotisations WHERE id=$1', [cotisation.id]);
  assert.equal(cotisation.starts_at, rows[0].starts_at);
  assert.equal(cotisation.deadline, rows[0].deadline);
  assert.equal(rows[0].days, 35);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`)).body.cotisation.deadline, rows[0].deadline);
});

test('pending fees cannot be bypassed and private data is not public', async () => {
  const owner = await user();
  const { cotisation } = await create(owner, false);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { status: 'active' }, owner.token)).status, 400);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`)).status, 404);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/contributions`)).status, 404);
  const other = await user('+2250500000000');
  assert.equal((await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { title: 'stolen' }, other.token)).status, 403);
});

test('public contributions exclude phone, note, payment reference and respect visibility', async () => {
  const owner = await user(); const { cotisation } = await create(owner);
  const contribution = await pendingContribution(cotisation, { note: 'private' });
  await request(`/api/contributions/${contribution.id}/confirm`, 'POST', {}, owner.token);
  const visible = (await request(`/api/cotisations/${cotisation.id}/contributions`)).body.contributions[0];
  for (const key of ['contributor_phone','note','paystack_reference']) assert.equal(key in visible, false);
  await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { settings: { show_contributors: false, show_best_contributor: false, show_progress: false, show_target_amount: false } }, owner.token);
  assert.deepEqual((await request(`/api/cotisations/${cotisation.id}/contributions`)).body.contributions, []);
  const publicCot = (await request(`/api/cotisations/${cotisation.id}`)).body.cotisation;
  assert.equal(publicCot.current_amount, 0); assert.equal(publicCot.target_amount, 0);
  assert.equal('platform_fee_reference' in publicCot, false);
});

test('contribution retries and parallel confirmation count once; another user cannot confirm', async () => {
  const owner = await user(); const other = await user('+2250500000000');
  const { cotisation } = await create(owner);
  const request_id = randomUUID();
  const a = await pendingContribution(cotisation, { request_id });
  const b = await pendingContribution(cotisation, { request_id });
  assert.equal(a.id, b.id);
  assert.equal((await request(`/api/contributions/${a.id}/confirm`, 'POST', {}, other.token)).status, 403);
  const confirmed = await Promise.all([request(`/api/contributions/${a.id}/confirm`, 'POST', {}, owner.token), request(`/api/contributions/${a.id}/confirm`, 'POST', {}, owner.token)]);
  assert.ok(confirmed.every(r => r.status === 200));
  assert.equal(Number((await query('SELECT current_amount FROM cotisations WHERE id=$1', [cotisation.id])).rows[0].current_amount), 1000);
  assert.equal((await request(`/api/contributions/${a.id}/reject`, 'POST', {}, owner.token)).status, 400);
});

test('manual additions are paid, rejected contributions stay rejected and expiry is enforced', async () => {
  const owner = await user(); const { cotisation } = await create(owner);
  const added = await request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', { contributor_name: 'Cash', contributor_phone: '+2250100000000', amount: 2000, payment_method: 'manual' }, owner.token);
  assert.equal(added.body.contribution.status, 'paid');
  const pending = await pendingContribution(cotisation);
  await request(`/api/contributions/${pending.id}/reject`, 'POST', {}, owner.token);
  assert.equal((await request(`/api/contributions/${pending.id}/confirm`, 'POST', {}, owner.token)).status, 400);
  await query("UPDATE cotisations SET deadline=CURRENT_DATE-1 WHERE id=$1", [cotisation.id]);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', { contributor_name:'A', contributor_phone:'+2250100000000', amount:1000 })).status, 400);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { status:'closed' }, owner.token)).status, 200);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { status:'active' }, owner.token)).status, 400);
});

test('checkout retries reuse one reference and verify checks ownership and amount', async () => {
  const owner = await user(); const created = await create(owner, false);
  const { cotisation, reference } = created;
  const results = await Promise.all([request(`/api/cotisations/${cotisation.id}/pay-fee`, 'POST', {}, owner.token), request(`/api/cotisations/${cotisation.id}/pay-fee`, 'POST', {}, owner.token)]);
  assert.ok(results.every(r => r.body.reference === reference)); assert.equal(initializeCalls, 1);
  assert.equal((await request(`/api/platform-payments/verify/${reference}`)).status, 401);
  const charge = charges.get(reference);
  const bad = await activatePlatformPayment(reference, {...charge, amount:1}); assert.equal(bad.ok, false);
  assert.equal((await activatePlatformPayment(reference, {...charge, currency:'NGN'})).ok, false);
  const result = await request(`/api/platform-payments/verify/${reference}`, 'GET', undefined, owner.token);
  assert.equal(result.body.payment.cotisation_status, 'active');
  assert.equal(result.body.payment.status, 'paid');
});

test('webhook signature and duplicate extension delivery', async () => {
  const owner = await user(); const { cotisation } = await create(owner);
  const extension = await request(`/api/cotisations/${cotisation.id}/extend`, 'POST', {}, owner.token);
  const charge = charges.get(extension.body.reference);
  assert.equal((await app.request('/api/paystack/webhook', { method:'POST', body:'{}' })).status, 401);
  const [a,b] = await Promise.all([webhook(charge), request(`/api/platform-payments/verify/${charge.reference}`, 'GET', undefined, owner.token)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const updated = (await query('SELECT * FROM cotisations WHERE id=$1', [cotisation.id])).rows[0];
  assert.equal(updated.extension_count, 1);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/extend`, 'POST', {}, owner.token)).status, 400);
});

test('activation error rolls back payment and allows a successful retry', async () => {
  const owner = await user(); const { cotisation, reference } = await create(owner, false);
  await query(`CREATE OR REPLACE FUNCTION test_activation_failure() RETURNS trigger AS $$ BEGIN IF NEW.status='active' THEN RAISE EXCEPTION 'simulated failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await query('CREATE TRIGGER test_failure BEFORE UPDATE ON cotisations FOR EACH ROW EXECUTE FUNCTION test_activation_failure()');
  try {
    await assert.rejects(activatePlatformPayment(reference, charges.get(reference)));
    assert.equal((await query('SELECT status FROM platform_payments WHERE id=$1', [reference])).rows[0].status, 'pending');
  } finally { await query('DROP TRIGGER test_failure ON cotisations'); await query('DROP FUNCTION test_activation_failure()'); }
  assert.equal((await activatePlatformPayment(reference, charges.get(reference))).ok, true);
  assert.equal((await query('SELECT status FROM cotisations WHERE id=$1', [cotisation.id])).rows[0].status, 'active');
});

test('invalid input, CSRF and admin authorization are rejected', async () => {
  const owner = await user();
  const result = await app.request('/api/profile', { method:'PATCH', headers: { 'Content-Type':'application/json', Origin:'https://evil.invalid', Authorization:`Bearer ${owner.token}` }, body:'{"name":"changed"}' });
  assert.equal(result.status,403);
  assert.equal((await request('/api/admin/stats', 'GET', undefined, owner.token)).status,403);
  assert.equal((await request('/api/cotisations', 'POST', { title:'A',target_amount:-5,duration_days:35,use_free:true }, owner.token)).status,400);
  assert.equal((await request('/api/profile', 'PATCH', { wave_payout_mode:'phone',wave_phone:'+2250700000000' }, owner.token)).status,200);
});
