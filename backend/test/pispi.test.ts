import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import {
  createPispiRequestToPay,
  getPispiRequestToPay,
  pispiConfig,
  pispiStatus,
  pispiWebhookTxIds,
  resetPispiTokenCacheForTests,
  verifyPispiWebhookSignature,
} from "../src/lib/pispi.js";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const payerAlias = randomUUID();
const payeeAlias = randomUUID();
const txId = randomUUID();
const calls: Array<{ url: string; init?: RequestInit }> = [];

function configure() {
  process.env.PISPI_ENVIRONMENT = "sandbox";
  process.env.PISPI_API_BASE_URL = "https://sandbox.api.pi-bceao.test/piz/v1";
  process.env.PISPI_TOKEN_URL = "https://auth.pi-bceao.test/oauth2/token";
  process.env.PISPI_CLIENT_ID = "client_test";
  process.env.PISPI_CLIENT_SECRET = "secret_test";
  process.env.PISPI_API_KEY = "api_test";
  process.env.PISPI_PAYEE_ALIAS = payeeAlias;
  process.env.PISPI_SCOPE_PREFIX = "piz/";
  process.env.PISPI_WEBHOOK_SECRET = "webhook_test_secret";
}

beforeEach(() => {
  Object.assign(process.env, originalEnv);
  configure();
  calls.length = 0;
  resetPispiTokenCacheForTests();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/oauth2/token")) {
      return Response.json({ access_token: "token_test", expires_in: 300, token_type: "Bearer" });
    }
    if (url.endsWith("/demandes-paiements") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return Response.json({ ...body, statut: "ENVOYE", end2endId: "E2E-123" });
    }
    if (url.endsWith(`/demandes-paiements/${txId}`)) {
      return Response.json({ txId, montant: 3000, statut: "IRREVOCABLE", end2endId: "E2E-123" });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
});

after(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test("PI-SPI sandbox creates an e-commerce Request-to-Pay with OAuth2 and API key", async () => {
  const before = Date.now();
  const result = await createPispiRequestToPay({
    txId,
    payerAlias,
    amount: 3000,
    purpose: "create",
    cotisationId: randomUUID(),
  });
  assert.equal(result.statut, "ENVOYE");
  assert.equal(calls.length, 2);

  const token = calls[0];
  assert.equal(token.url, process.env.PISPI_TOKEN_URL);
  assert.equal(token.init?.method, "POST");
  const form = new URLSearchParams(String(token.init?.body));
  assert.equal(form.get("grant_type"), "client_credentials");
  assert.equal(form.get("client_id"), "client_test");
  assert.equal(form.get("client_secret"), "secret_test");
  assert.equal(form.get("scope"), "piz/demande_paiement.write");

  const request = calls[1];
  assert.equal(request.url, `${process.env.PISPI_API_BASE_URL}/demandes-paiements`);
  const headers = new Headers(request.init?.headers);
  assert.equal(headers.get("authorization"), "Bearer token_test");
  assert.equal(headers.get("x-api-key"), "api_test");
  const body = JSON.parse(String(request.init?.body));
  assert.equal(body.txId, txId);
  assert.equal(body.confirmation, false);
  assert.equal(body.categorie, "521");
  assert.equal(body.payeurAlias, payerAlias);
  assert.equal(body.payeAlias, payeeAlias);
  assert.equal(body.montant, 3000);
  const deadline = Date.parse(body.dateLimitePaiement);
  assert.ok(deadline > before);
  assert.ok(deadline <= before + 3 * 60_000);
});

test("PI-SPI status verification requests read scope and maps irreversible status", async () => {
  const result = await getPispiRequestToPay(txId);
  assert.equal(pispiStatus(result), "IRREVOCABLE");
  assert.equal(calls.length, 2);
  const form = new URLSearchParams(String(calls[0].init?.body));
  assert.equal(form.get("scope"), "piz/demande_paiement.read");
  assert.equal(calls[1].url, `${process.env.PISPI_API_BASE_URL}/demandes-paiements/${txId}`);
});

test("PI-SPI token is cached for identical scopes", async () => {
  await createPispiRequestToPay({ txId, payerAlias, amount: 3000, purpose: "create", cotisationId: randomUUID() });
  await createPispiRequestToPay({ txId: randomUUID(), payerAlias, amount: 1500, purpose: "extend", cotisationId: randomUUID() });
  assert.equal(calls.filter(call => call.url.includes("/oauth2/token")).length, 1);
});

test("PI-SPI production remains blocked until participant mTLS/PICERT is implemented", () => {
  process.env.PISPI_ENVIRONMENT = "production";
  assert.throws(pispiConfig, /mTLS\/PICERT/);
});

test("PI-SPI webhook HMAC uses the raw body and rejects malformed signatures", () => {
  const raw = JSON.stringify({ data: [{ txId, evCode: "PAIEMENT_IRREVOCABLE" }] });
  const signature = createHmac("sha256", process.env.PISPI_WEBHOOK_SECRET!).update(raw).digest("hex");
  assert.equal(verifyPispiWebhookSignature(raw, signature), true);
  assert.equal(verifyPispiWebhookSignature(raw + " ", signature), false);
  assert.equal(verifyPispiWebhookSignature(raw, "invalid"), false);
});

test("PI-SPI webhook transaction extraction is duplicate-safe", () => {
  assert.deepEqual(
    pispiWebhookTxIds({ data: [{ txId }, { txId }, { txId: "other" }, { nope: true }] }),
    [txId, "other"]
  );
  assert.deepEqual(pispiWebhookTxIds({ txId }), [txId]);
  assert.deepEqual(pispiWebhookTxIds(null), []);
});
