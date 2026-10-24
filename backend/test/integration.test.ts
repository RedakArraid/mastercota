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
process.env.PLATFORM_PAYMENT_PRIMARY = 'paystack';
process.env.PISPI_ENABLED = 'true';
process.env.PISPI_ENVIRONMENT = 'sandbox';
process.env.PISPI_PARTICIPANT = 'TEST';
process.env.PISPI_API_BASE_URL = 'https://sandbox.pispi.test/piz/v1';
process.env.PISPI_TOKEN_URL = 'https://sandbox.pispi.test/oauth2/token';
process.env.PISPI_CLIENT_ID = 'test-client';
process.env.PISPI_CLIENT_SECRET = 'test-client-secret';
process.env.PISPI_API_KEY = 'test-api-key';
process.env.PISPI_PAYEE_ALIAS = '11111111-1111-4111-8111-111111111111';
process.env.PISPI_SCOPE_PREFIX = 'piz/';
process.env.PISPI_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.APP_URL = 'http://localhost:3000';
const { app } = await import('../src/index.js');
const { pool, query } = await import('../src/lib/db.js');
const { signSession } = await import('../src/lib/auth.js');
const { activatePlatformPayment, initializePlatformFeePaystack } = await import('../src/lib/billing.js');
const { resetPispiTokenCacheForTests } = await import('../src/lib/pispi.js');
const { validateEnvironment } = await import('../src/lib/security.js');
const { normalizeWavePhone } = await import('../src/lib/wave.js');
const charges = new Map<string, any>();
const originalFetch = globalThis.fetch;
let initializeCalls = 0;
let lostInitializeResponse = false;
let failVerification = false;
let waitForFullPool = false;
const pispiRequests = new Map<string, any>();
let pispiTokenCalls = 0;
globalThis.fetch = async (input, init) => {
  const target = String(input);
  if (target === process.env.PISPI_TOKEN_URL) {
    pispiTokenCalls++;
    return Response.json({ access_token: 'pispi-test-token', expires_in: 300 });
  }
  if (target.startsWith(process.env.PISPI_API_BASE_URL!)) {
    assert.equal(new Headers(init?.headers).get('x-api-key'), process.env.PISPI_API_KEY);
    if (target.endsWith('/demandes-paiements') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      const value = { ...body, statut: 'ENVOYE', end2endId: `E2E-${body.txId}` };
      pispiRequests.set(body.txId, value);
      return Response.json(value);
    }
    const reference = decodeURIComponent(target.split('/').at(-1)!);
    const value = pispiRequests.get(reference);
    return value ? Response.json(value) : Response.json({ message: 'Not found' }, { status: 404 });
  }
  assert.ok(target.startsWith('https://api.paystack.co/'), `Unexpected external request: ${target}`);
  if (target.endsWith('/initialize')) {
    initializeCalls++;
    const body = JSON.parse(String(init?.body));
    charges.set(body.reference, { ...body, status: 'abandoned' });
    if (lostInitializeResponse) { lostInitializeResponse = false; throw new TypeError('Simulated lost initialize response'); }
    return Response.json({ status: true, data: { authorization_url: `https://checkout.paystack.com/${body.reference}` } });
  }
  const reference = target.split('/').at(-1)!;
  if (waitForFullPool) {
    const until = Date.now() + 2000;
    while ((pool.totalCount < 10 || pool.idleCount > 0) && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(pool.totalCount, 10); assert.equal(pool.idleCount, 0);
    waitForFullPool = false;
  }
  if (failVerification) return Response.json({ status: false, message: 'Unavailable' }, { status: 503 });
  return charges.has(reference) ? Response.json({ status: true, data: charges.get(reference) }) : Response.json({ status: false, message: 'Transaction reference not found' }, { status: 404 });
};
beforeEach(async () => {
  await query('TRUNCATE users, otp_codes, phone_entitlements, request_limits RESTART IDENTITY CASCADE');
  charges.clear(); initializeCalls = 0; lostInitializeResponse = false; failVerification = false; waitForFullPool = false;
  pispiRequests.clear(); pispiTokenCalls = 0; resetPispiTokenCacheForTests();
  process.env.PLATFORM_PAYMENT_PRIMARY = 'paystack';
  await query("UPDATE platform_payment_settings SET active_provider='paystack',updated_by=NULL,updated_at=now() WHERE id=1");
  await query("DELETE FROM platform_payment_provider_events");
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
  const res = await request('/api/cotisations', 'POST', { request_id: randomUUID(), title: 'Collecte test', target_amount: 50000, duration_days: free ? 35 : 15, use_free: free }, owner.token);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}
async function pendingContribution(cot: any, overrides: any = {}) {
  const res = await request(`/api/cotisations/${cot.id}/contributions`, 'POST', { contributor_name: 'Alice', contributor_phone: '+2250100000000', amount: 1000, request_id: randomUUID(), ...overrides });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.contribution;
}
function successfulCharge(reference: string) {
  const charge = charges.get(reference);
  assert.ok(charge, `Missing checkout ${reference}`);
  charge.status = 'success';
  return charge;
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
  const results = await Promise.all([request('/api/cotisations', 'POST', { ...body, request_id: randomUUID() }, owner.token), request('/api/cotisations', 'POST', { ...body, request_id: randomUUID() }, owner.token)]);
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

test('manual additions are paid, rejected contributions stay rejected and expired receipts remain recordable', async () => {
  const owner = await user(); const { cotisation } = await create(owner);
  const added = await request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', { request_id: randomUUID(), contributor_name: 'Cash', contributor_phone: '+2250100000000', amount: 2000, payment_method: 'manual' }, owner.token);
  assert.equal(added.body.contribution.status, 'paid');
  const pending = await pendingContribution(cotisation);
  await request(`/api/contributions/${pending.id}/reject`, 'POST', {}, owner.token);
  assert.equal((await request(`/api/contributions/${pending.id}/confirm`, 'POST', {}, owner.token)).status, 400);
  await query("UPDATE cotisations SET deadline=CURRENT_DATE-1 WHERE id=$1", [cotisation.id]);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', { request_id: randomUUID(), contributor_name:'A', contributor_phone:'+2250100000000', amount:1000 })).status, 201);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { status:'closed' }, owner.token)).status, 200);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`, 'PATCH', { status:'active' }, owner.token)).status, 400);
});

test('checkout retries reuse one reference and verify checks ownership and amount', async () => {
  const owner = await user(); const created = await create(owner, false);
  const { cotisation, reference } = created;
  const results = await Promise.all([request(`/api/cotisations/${cotisation.id}/pay-fee`, 'POST', {}, owner.token), request(`/api/cotisations/${cotisation.id}/pay-fee`, 'POST', {}, owner.token)]);
  assert.ok(results.every(r => r.body.reference === reference)); assert.equal(initializeCalls, 1);
  assert.equal((await request(`/api/platform-payments/verify/${reference}`)).status, 401);
  const charge = successfulCharge(reference);
  const bad = await activatePlatformPayment(reference, {...charge, amount:1}); assert.equal(bad.ok, false);
  assert.equal((await activatePlatformPayment(reference, {...charge, currency:'NGN'})).ok, false);
  const result = await request(`/api/platform-payments/verify/${reference}`, 'GET', undefined, owner.token);
  assert.equal(result.body.payment.cotisation_status, 'active');
  assert.equal(result.body.payment.status, 'paid');
});

test('only admin controls payment routing and clients never see or choose the provider', async () => {
  const owner = await user();
  const admin = await user('+2250500000000');
  await query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);

  assert.equal((await request('/api/admin/payment-routing', 'GET', undefined, owner.token)).status, 403);
  const switched = await request(
    '/api/admin/payment-routing',
    'PATCH',
    { provider: 'pispi', note: 'Test du rail principal' },
    admin.token
  );
  assert.equal(switched.status, 200, JSON.stringify(switched.body));
  assert.equal(switched.body.active_provider, 'pispi');

  const created = await create(owner, false);
  assert.equal(created.payment_required, true);
  assert.equal(created.payment_action_required, 'payment_identifier');
  assert.equal('provider' in created, false);
  assert.equal('providers' in created, false);
  assert.equal(initializeCalls, 0);

  const payerAlias = '22222222-2222-4222-8222-222222222222';
  const started = await request(
    `/api/cotisations/${created.cotisation.id}/pay-fee`,
    'POST',
    { provider: 'paystack', payment_identifier: payerAlias },
    owner.token
  );
  assert.equal(started.status, 200, JSON.stringify(started.body));
  assert.equal(started.body.payment_status, 'pending');
  assert.equal('provider' in started.body, false);
  assert.equal('provider_status' in started.body, false);
  assert.ok(started.body.reference);
  assert.equal(pispiTokenCalls, 1);
  assert.equal(initializeCalls, 0);

  const row = (await query('SELECT * FROM platform_payments WHERE id=$1', [started.body.reference])).rows[0];
  assert.equal(row.provider, 'pispi');
  assert.equal(row.provider_reference, started.body.reference);
  assert.equal(row.paystack_reference, null);
  assert.equal(row.status, 'pending');

  const fallback = await request(
    '/api/admin/payment-routing',
    'PATCH',
    { provider: 'paystack', note: 'Incident simulé PI-SPI' },
    admin.token
  );
  assert.equal(fallback.status, 200);
  assert.equal(fallback.body.active_provider, 'paystack');

  const retryWhileInFlight = await request(
    `/api/cotisations/${created.cotisation.id}/pay-fee`,
    'POST',
    { provider: 'paystack' },
    owner.token
  );
  assert.equal(retryWhileInFlight.status, 400);
  assert.equal(initializeCalls, 0);
  assert.doesNotMatch(retryWhileInFlight.body.error, /PI-SPI|Paystack|prestataire/i);

  const remote = pispiRequests.get(started.body.reference);
  remote.statut = 'IRREVOCABLE';
  remote.montant = Number(row.amount);
  const webhookBody = JSON.stringify({ data: [{ txId: started.body.reference, evCode: 'PAIEMENT_IRREVOCABLE' }] });
  const signature = createHmac('sha256', process.env.PISPI_WEBHOOK_SECRET!).update(webhookBody).digest('hex');

  assert.equal((await app.request('/api/pispi/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': 'bad' }, body: webhookBody })).status, 401);
  assert.equal((await app.request('/api/pispi/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': signature }, body: webhookBody })).status, 200);

  const verified = await request(`/api/platform-payments/verify/${started.body.reference}`, 'GET', undefined, owner.token);
  assert.equal(verified.status, 200);
  assert.equal(verified.body.payment_status, 'paid');
  assert.equal('provider' in verified.body, false);
  assert.equal('provider_status' in verified.body, false);
  assert.equal('paystack_status' in verified.body, false);
  assert.equal(verified.body.payment.status, 'paid');
  assert.equal(verified.body.payment.application_status, 'applied');
  assert.equal(verified.body.payment.cotisation_status, 'active');

  const routing = await request('/api/admin/payment-routing', 'GET', undefined, admin.token);
  assert.equal(routing.status, 200);
  assert.equal(routing.body.active_provider, 'paystack');
  assert.ok(routing.body.history.length >= 2);
});

test('webhook signature and duplicate extension delivery', async () => {
  const owner = await user(); const { cotisation } = await create(owner);
  const extension = await request(`/api/cotisations/${cotisation.id}/extend`, 'POST', {}, owner.token);
  const charge = successfulCharge(extension.body.reference);
  assert.equal((await app.request('/api/paystack/webhook', { method:'POST', body:'{}' })).status, 401);
  const [a,b] = await Promise.all([webhook(charge), request(`/api/platform-payments/verify/${charge.reference}`, 'GET', undefined, owner.token)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const updated = (await query('SELECT * FROM cotisations WHERE id=$1', [cotisation.id])).rows[0];
  assert.equal(updated.extension_count, 1);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/extend`, 'POST', {}, owner.token)).status, 400);
});

test('activation error rolls back payment and allows a successful retry', async () => {
  const owner = await user(); const { cotisation, reference } = await create(owner, false);
  successfulCharge(reference);
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


test('creation retries are idempotent, consume the free entitlement once and reject a reused key with changed payload', async () => {
  const owner = await user();
  const payload = { request_id: randomUUID(), title: 'Création stable', target_amount: 10000, duration_days: 35, use_free: true };
  const [a, b] = await Promise.all([request('/api/cotisations', 'POST', payload, owner.token), request('/api/cotisations', 'POST', payload, owner.token)]);
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  assert.equal(a.body.cotisation.id, b.body.cotisation.id);
  assert.equal(Number((await query('SELECT count(*) FROM cotisations')).rows[0].count), 1);
  assert.equal((await query('SELECT free_cotisations_used FROM phone_entitlements')).rows[0].free_cotisations_used, 1);
  assert.equal((await request('/api/cotisations', 'POST', {...payload, title: 'Different'}, owner.token)).status, 409);
  assert.equal((await request('/api/cotisations', 'POST', {...payload, request_id: undefined}, owner.token)).status, 400);
});

test('paid creation retries return the same cotisation and reference before and after settlement', async () => {
  const owner = await user();
  const payload = { request_id: randomUUID(), title: 'Payante stable', target_amount: 10000, duration_days: 15, use_free: false };
  const [a,b] = await Promise.all([request('/api/cotisations', 'POST', payload, owner.token), request('/api/cotisations', 'POST', payload, owner.token)]);
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  assert.equal(a.body.reference, b.body.reference); assert.equal(initializeCalls, 1);
  await activatePlatformPayment(a.body.reference, successfulCharge(a.body.reference));
  const again = await request('/api/cotisations', 'POST', payload, owner.token);
  assert.equal(again.body.cotisation.id, a.body.cotisation.id);
  assert.equal(again.body.payment_required, false); assert.equal(initializeCalls, 1);
});

test('manual receipts require a request key and concurrent retries count once even after manual closure', async () => {
  const owner = await user(); const {cotisation} = await create(owner);
  await request(`/api/cotisations/${cotisation.id}`, 'PATCH', {status:'closed', settings:{ min_amount:5000 }}, owner.token);
  const payload = { request_id:randomUUID(), contributor_name:'Espèces reçues', contributor_phone:'+2250100000000', amount:1000, payment_method:'manual' };
  assert.equal((await request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', {...payload, request_id:undefined}, owner.token)).status, 400);
  const [a,b] = await Promise.all([request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', payload, owner.token),request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', payload, owner.token)]);
  assert.equal(a.status,201); assert.equal(b.status,201); assert.equal(a.body.contribution.id,b.body.contribution.id);
  const cot = (await request(`/api/cotisations/${cotisation.id}`, 'GET', undefined, owner.token)).body.cotisation;
  assert.equal(Number(cot.current_amount),1000); assert.equal(cot.status,'closed'); assert.equal(cot.close_reason,'manual');
  assert.equal(cot.lifecycle.can_record_contribution,true);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/contributions`, 'POST', {...payload,amount:2000}, owner.token)).status,409);
});

test('late Wave reports can be confirmed after manual closure, completion and expiration without reopening collection', async () => {
  const owner = await user();
  for (const ending of ['manual','completed','expired']) {
    const {cotisation,reference} = await create(owner, false);
    await activatePlatformPayment(reference, successfulCharge(reference));
    if (ending === 'manual') await request(`/api/cotisations/${cotisation.id}`, 'PATCH',{status:'closed'},owner.token);
    if (ending === 'completed') {
      const first=await pendingContribution(cotisation,{amount:50000});
      await request(`/api/contributions/${first.id}/confirm`,'POST',{},owner.token);
    }
    if (ending === 'expired') await query('UPDATE cotisations SET deadline=CURRENT_DATE-1 WHERE id=$1',[cotisation.id]);
    const reported=await pendingContribution(cotisation);
    assert.equal(reported.status,'awaiting_confirmation');
    assert.equal((await request(`/api/contributions/${reported.id}/confirm`,'POST',{},owner.token)).status,200);
    const cot=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
    assert.equal(cot.status,ending==='completed'?'completed':'closed');
    assert.equal(cot.close_reason,ending==='completed'?null:ending);
    assert.equal(Number(cot.current_amount),ending==='completed'?51000:1000);
  }
});

test('target edits reactivate completed cotisations within the valid period, preserve manual closure and detect stale edits', async () => {
  const owner=await user(); const {cotisation}=await create(owner);
  const contribution=await pendingContribution(cotisation,{amount:50000});
  await request(`/api/contributions/${contribution.id}/confirm`,'POST',{},owner.token);
  const reopened=await request(`/api/cotisations/${cotisation.id}`,'PATCH',{target_amount:60000,expected_edit_version:0},owner.token);
  assert.equal(reopened.body.cotisation.status,'active'); assert.equal(reopened.body.cotisation.edit_version,1);
  assert.equal((await request(`/api/cotisations/${cotisation.id}`,'PATCH',{title:'Stale',expected_edit_version:0},owner.token)).status,409);
  const completed=await request(`/api/cotisations/${cotisation.id}`,'PATCH',{target_amount:40000},owner.token);
  assert.equal(completed.body.cotisation.status,'completed');
  await query('UPDATE cotisations SET deadline=CURRENT_DATE-1 WHERE id=$1',[cotisation.id]);
  const expired=await request(`/api/cotisations/${cotisation.id}`,'PATCH',{target_amount:60000},owner.token);
  assert.equal(expired.body.cotisation.status,'closed'); assert.equal(expired.body.cotisation.close_reason,'expired');
  await query('UPDATE cotisations SET deadline=CURRENT_DATE+1 WHERE id=$1',[cotisation.id]);
  await request(`/api/cotisations/${cotisation.id}`,'PATCH',{status:'closed'},owner.token);
  const manuallyClosed=await request(`/api/cotisations/${cotisation.id}`,'PATCH',{target_amount:70000},owner.token);
  assert.equal(manuallyClosed.body.cotisation.status,'closed'); assert.equal(manuallyClosed.body.cotisation.close_reason,'manual');
});

test('a late paid extension is recorded for review once without consuming the extension or announcing activation', async () => {
  const owner=await user(); const admin=await user('+2250500000000');
  await query("UPDATE users SET role='admin' WHERE id=$1",[admin.id]);
  const {cotisation}=await create(owner);
  const extension=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  const charge=successfulCharge(extension.body.reference);
  await query("UPDATE cotisations SET starts_at=CURRENT_DATE-46,deadline=CURRENT_DATE-11,status='closed',close_reason='expired' WHERE id=$1",[cotisation.id]);
  const results=await Promise.all([activatePlatformPayment(charge.reference,charge),activatePlatformPayment(charge.reference,charge)]);
  assert.ok(results.every(r=>r.ok));
  const payment=(await request(`/api/platform-payments/verify/${charge.reference}`,'GET',undefined,owner.token)).body.payment;
  assert.equal(payment.status,'paid'); assert.equal(payment.application_status,'review_required'); assert.equal(payment.review_reason,'extension_expired');
  const cot=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
  assert.equal(cot.status,'closed'); assert.equal(cot.extension_count,0); assert.equal(cot.platform_payment.application_status,'review_required'); assert.equal(cot.lifecycle.can_extend,false);
  assert.equal(Number((await query("SELECT count(*) FROM notifications WHERE title='Paiement à examiner' AND user_id=$1",[owner.id])).rows[0].count),1);
  const reviews=await request('/api/admin/platform-payments?application_status=review_required','GET',undefined,admin.token);
  assert.equal(reviews.status,200); assert.equal(reviews.body.payments.length,1);
  assert.equal(reviews.body.payments[0].paystack_reference,charge.reference);
});

test('extensions reopen expiration but preserve manual closure, and include their final calendar day', async () => {
  const owner=await user();
  for (const reason of ['manual','expired']) {
    const {cotisation,reference}=await create(owner,false);
    await activatePlatformPayment(reference,successfulCharge(reference));
    await query("UPDATE cotisations SET starts_at=CURRENT_DATE-25,deadline=CURRENT_DATE-10,status='closed',close_reason=$2 WHERE id=$1",[cotisation.id,reason]);
    const ext=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
    assert.equal(ext.status,200,JSON.stringify(ext.body));
    await activatePlatformPayment(ext.body.reference,successfulCharge(ext.body.reference));
    const cot=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
    assert.equal(cot.status,reason==='manual'?'closed':'active'); assert.equal(cot.extension_count,1);
    assert.equal(cot.deadline,(await query('SELECT CURRENT_DATE::text AS today')).rows[0].today);
    if(reason==='expired') {
      assert.equal((await request(`/api/cotisations/${cot.id}`,'PATCH',{status:'closed'},owner.token)).status,200);
      assert.equal((await request(`/api/cotisations/${cot.id}`,'PATCH',{status:'active'},owner.token)).body.cotisation.status,'active');
    }
  }
});

test('checkout retries verify the existing charge, replace failed checkouts and never rotate an uncertain pending payment', async () => {
  const owner=await user(); const {cotisation,reference}=await create(owner,false);
  charges.get(reference).status='pending';
  const pending=await request(`/api/cotisations/${cotisation.id}/pay-fee`,'POST',{},owner.token);
  assert.equal(pending.body.reference,reference); assert.equal(initializeCalls,1);
  failVerification=true;
  assert.equal((await request(`/api/cotisations/${cotisation.id}/pay-fee`,'POST',{},owner.token)).status,400);
  assert.equal(initializeCalls,1); failVerification=false;
  charges.get(reference).status='failed';
  const retry=await request(`/api/cotisations/${cotisation.id}/pay-fee`,'POST',{},owner.token);
  assert.equal(retry.status,200); assert.notEqual(retry.body.reference,reference); assert.equal(initializeCalls,2);
  await activatePlatformPayment(retry.body.reference,successfulCharge(retry.body.reference));
  // Even a contradictory, delayed provider success for the old checkout cannot deliver twice.
  const old=await activatePlatformPayment(reference,successfulCharge(reference));
  assert.ok(old.ok); if(old.ok) assert.equal(old.payment.application_status,'review_required');
  assert.equal((await query("SELECT count(*) FROM platform_payments WHERE application_status='applied'")).rows[0].count,'1');
});

test('lost initialize responses recover safely and a completed payment is never charged again', async () => {
  const owner=await user(); lostInitializeResponse=true;
  const created=await create(owner,false);
  assert.ok(created.payment_error); assert.equal(initializeCalls,1);
  const oldReference=(await query('SELECT paystack_reference FROM platform_payments')).rows[0].paystack_reference;
  const resumed=await request(`/api/cotisations/${created.cotisation.id}/pay-fee`,'POST',{},owner.token);
  assert.equal(resumed.status,200); assert.ok(resumed.body.authorization_url); assert.notEqual(resumed.body.reference,oldReference);
  successfulCharge(resumed.body.reference);
  const alreadyPaid=await request(`/api/cotisations/${created.cotisation.id}/pay-fee`,'POST',{},owner.token);
  assert.equal(alreadyPaid.body.payment_required,false); assert.equal(alreadyPaid.body.application_status,'applied'); assert.equal(initializeCalls,2);
});

test('ten simultaneous paid checkout retries reuse their database connection without pool starvation', { timeout: 15000 }, async () => {
  const owner=await user(); const {cotisation,reference}=await create(owner,false);
  successfulCharge(reference); waitForFullPool=true;
  const results=await Promise.all(Array.from({length:10},()=>initializePlatformFeePaystack({
    userId:owner.id,phone:owner.phone,cotisationId:cotisation.id,purpose:'create',amount:2000,callbackPath:`/cotisation/${cotisation.id}/frais`,
  })));
  assert.ok(results.every(r=>r.payment_required===false && r.reference===reference));
  assert.equal(initializeCalls,1);
  assert.equal((await query("SELECT count(*) FROM platform_payments WHERE application_status='applied'")).rows[0].count,'1');
});

test('an unpaid extension checkout that becomes expired is not offered again', async () => {
  const owner=await user(); const {cotisation}=await create(owner);
  const first=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  assert.equal(first.status,200);
  await query("UPDATE cotisations SET starts_at=CURRENT_DATE-46,deadline=CURRENT_DATE-11,status='closed',close_reason='expired' WHERE id=$1",[cotisation.id]);
  const resumed=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  assert.equal(resumed.status,400); assert.equal(resumed.body.authorization_url,undefined); assert.equal(initializeCalls,1);
  assert.match(resumed.body.error,/expirée/);
});

test('an in-flight payment after a lost initialize response is verified without generating a second checkout', async () => {
  const owner=await user(); lostInitializeResponse=true; const created=await create(owner,false);
  const reference=created.reference;
  charges.get(reference).status='pending';
  const pending=await request(`/api/cotisations/${created.cotisation.id}/pay-fee`,'POST',{},owner.token);
  assert.equal(pending.status,400); assert.equal(initializeCalls,1);
  successfulCharge(reference);
  const paid=await request(`/api/cotisations/${created.cotisation.id}/pay-fee`,'POST',{},owner.token);
  assert.equal(paid.body.payment_required,false); assert.equal(paid.body.application_status,'applied'); assert.equal(initializeCalls,1);
});

test('a completed goal blocks new extension charges but a previously paid extension still applies without reopening', async () => {
  const owner=await user(); const {cotisation}=await create(owner);
  const extension=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  const reported=await pendingContribution(cotisation,{amount:50000});
  await request(`/api/contributions/${reported.id}/confirm`,'POST',{},owner.token);
  const detail=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
  assert.equal(detail.lifecycle.can_extend,false);
  assert.equal((await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token)).status,400);
  assert.equal(initializeCalls,1);
  await activatePlatformPayment(extension.body.reference,successfulCharge(extension.body.reference));
  const extended=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
  assert.equal(extended.status,'completed'); assert.equal(extended.extension_count,1); assert.equal(extended.platform_payment.application_status,'applied');
});

test('historical review payments remain visible and prevent another checkout', async () => {
  const owner=await user(); const {cotisation,reference}=await create(owner,false);
  charges.get(reference).status='failed';
  const retry=await request(`/api/cotisations/${cotisation.id}/pay-fee`,'POST',{},owner.token);
  await activatePlatformPayment(retry.body.reference,successfulCharge(retry.body.reference));
  await activatePlatformPayment(reference,successfulCharge(reference));
  const detail=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
  assert.equal(detail.platform_payment.reference,reference); assert.equal(detail.platform_payment.application_status,'review_required'); assert.equal(detail.lifecycle.can_extend,false);
  const extension=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  assert.equal(extension.status,400); assert.equal(initializeCalls,2);
});

test('only an admin can close a review with a note; retries preserve history and unlock a valid extension', async () => {
  const owner=await user(); const admin=await user('+2250500000000');
  await query("UPDATE users SET role='admin' WHERE id=$1",[admin.id]);
  const {cotisation,reference}=await create(owner,false);
  charges.get(reference).status='failed';
  const retry=await request(`/api/cotisations/${cotisation.id}/pay-fee`,'POST',{},owner.token);
  await activatePlatformPayment(retry.body.reference,successfulCharge(retry.body.reference));
  await activatePlatformPayment(reference,successfulCharge(reference));
  const before=(await query('SELECT * FROM platform_payments WHERE id=$1',[reference])).rows[0];
  const path=`/api/admin/platform-payments/${reference}/resolve-review`;
  assert.equal((await request(path,'POST',{note:'Examiné'})).status,403);
  assert.equal((await request(path,'POST',{note:'Examiné'},owner.token)).status,403);
  for(const note of [undefined,'   ','x'.repeat(2001)]) assert.equal((await request(path,'POST',{note},admin.token)).status,400);
  assert.equal((await request(`/api/admin/platform-payments/${retry.body.reference}/resolve-review`,'POST',{note:'Examiné'},admin.token)).status,400);
  assert.equal((await request(`/api/admin/platform-payments/${randomUUID()}/resolve-review`,'POST',{note:'Examiné'},admin.token)).status,404);
  assert.equal((await request('/api/admin/stats','GET',undefined,admin.token)).body.stats.platformPaymentsReview,1);
  const note='Dossier contrôlé avec l’organisateur. La décision a été communiquée séparément ; cette clôture ne déclenche aucun remboursement.';
  const results=await Promise.all([request(path,'POST',{note},admin.token),request(path,'POST',{note},admin.token)]);
  assert.ok(results.every(r=>r.status===200));
  assert.deepEqual(results.map(r=>r.body.already_resolved).sort(),[false,true]);
  const verified=(await request(`/api/platform-payments/verify/${reference}`,'GET',undefined,owner.token)).body.payment;
  assert.equal(verified.status,'paid'); assert.equal(verified.application_status,'review_required'); assert.equal(verified.review_reason,'duplicate_service');
  assert.equal(verified.review_resolved_by,admin.id); assert.equal(verified.review_resolution_note,note); assert.ok(verified.review_resolved_at);
  assert.equal(verified.paid_at,new Date(before.paid_at).toISOString()); assert.equal(verified.amount,before.amount);
  const repeated=await request(path,'POST',{note:'Ne doit pas remplacer la note initiale'},admin.token);
  assert.equal(repeated.body.already_resolved,true); assert.equal(repeated.body.payment.review_resolution_note,note);
  assert.equal(Number((await query("SELECT count(*) FROM notifications WHERE user_id=$1 AND title='Examen du paiement terminé'",[owner.id])).rows[0].count),1);
  assert.equal((await request('/api/admin/platform-payments','GET',undefined,admin.token)).body.payments.length,0);
  assert.equal((await request('/api/admin/platform-payments?application_status=review_resolved','GET',undefined,admin.token)).body.payments.length,1);
  assert.equal((await request('/api/admin/platform-payments?application_status=all','GET',undefined,admin.token)).body.payments.length,2);
  assert.equal((await request('/api/admin/stats','GET',undefined,admin.token)).body.stats.platformPaymentsReview,0);
  const detail=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
  assert.equal(detail.lifecycle.can_extend,true); assert.equal(detail.extension_count,0); assert.equal(initializeCalls,2);
  const extension=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  assert.equal(extension.status,200); assert.equal(extension.body.payment_required,true); assert.ok(extension.body.authorization_url); assert.equal(initializeCalls,3);
});

test('closing an expired extension review does not apply the service or bypass its date limit', async () => {
  const owner=await user(); const admin=await user('+2250500000000');
  await query("UPDATE users SET role='admin' WHERE id=$1",[admin.id]);
  const {cotisation}=await create(owner);
  const ext=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  await query("UPDATE cotisations SET starts_at=CURRENT_DATE-46,deadline=CURRENT_DATE-11,status='closed',close_reason='expired' WHERE id=$1",[cotisation.id]);
  await activatePlatformPayment(ext.body.reference,successfulCharge(ext.body.reference));
  assert.equal((await request(`/api/admin/platform-payments/${ext.body.reference}/resolve-review`,'POST',{note:'Examen terminé. La période ne peut pas être prolongée.'},admin.token)).status,200);
  const detail=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
  assert.equal(detail.platform_payment.application_status,'review_required'); assert.ok(detail.platform_payment.review_resolved_at); assert.equal(detail.lifecycle.can_extend,false);
  assert.equal(detail.status,'closed'); assert.equal(detail.extension_count,0);
  const retry=await request(`/api/cotisations/${cotisation.id}/extend`,'POST',{},owner.token);
  assert.equal(retry.status,400); assert.equal(initializeCalls,1);
  assert.equal((await activatePlatformPayment(ext.body.reference,successfulCharge(ext.body.reference))).already,true);
  assert.equal((await query('SELECT extension_count FROM cotisations WHERE id=$1',[cotisation.id])).rows[0].extension_count,0);
});

test('cotisation edits and status transitions preserve the owner Wave fields returned by GET', async () => {
  const owner=await user(); const {cotisation}=await create(owner);
  const fields=['owner_name','owner_wave_phone','owner_wave_pay_link','owner_wave_payout_mode'];
  for(const mode of ['phone','business']) {
    const profile=await request('/api/profile','PATCH',{
      name:`Organisateur ${mode}`,wave_payout_mode:mode,wave_phone:'+2250700000000',wave_pay_link:'https://pay.wave.com/m/M_test/c/ci/',
    },owner.token);
    assert.equal(profile.status,200,JSON.stringify(profile.body));
    for(const change of [{title:`Collecte ${mode}`},{status:'closed'},{status:'active'}]) {
      const before=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
      const updated=await request(`/api/cotisations/${cotisation.id}`,'PATCH',{...change,expected_edit_version:before.edit_version},owner.token);
      assert.equal(updated.status,200,JSON.stringify(updated.body));
      for(const field of fields) {
        assert.ok(Object.hasOwn(updated.body.cotisation,field),`PATCH must include ${field}`);
        assert.equal(updated.body.cotisation[field],before[field]);
      }
      assert.equal(updated.body.cotisation.owner_name,`Organisateur ${mode}`);
      assert.equal(updated.body.cotisation.owner_wave_payout_mode,mode);
      assert.ok(updated.body.cotisation[mode==='phone'?'owner_wave_phone':'owner_wave_pay_link']);
      const after=(await request(`/api/cotisations/${cotisation.id}`,'GET',undefined,owner.token)).body.cotisation;
      assert.deepEqual(updated.body.cotisation,after);
    }
  }
});
