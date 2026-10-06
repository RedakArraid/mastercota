import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

test('administrator review resolution preserves payment history and unlocks an eligible retry', async ({ page, request }) => {
  test.setTimeout(120_000);
  await request.post('http://127.0.0.1:4001/__test__/reset');
  await page.goto('/auth/phone');
  await page.getByPlaceholder('0700000000').fill('0700000091');
  await page.getByRole('button', { name: 'Recevoir le code WhatsApp' }).click();
  await page.getByLabel('Code à 6 chiffres').fill('123456');
  await page.getByRole('button', { name: 'Valider et entrer' }).click();
  await expect(page).toHaveURL(/\/profile$/, { timeout: 45000 });

  expect((await page.request.get('/api/admin/platform-payments')).status()).toBe(403);
  expect((await page.request.patch('/api/profile', {
    data: { name: 'Organisateur test', wave_payout_mode: 'phone', wave_phone: '+2250700000091' },
  })).status()).toBe(200);
  const creation = await page.request.post('/api/cotisations', {
    data: { title: 'Frais à vérifier', target_amount: 50000, duration_days: 35, use_free: true, request_id: randomUUID() },
  });
  expect(creation.status()).toBe(201);
  const { cotisation } = await creation.json();
  const fixture = await request.post(`http://127.0.0.1:4001/__test__/cotisations/${cotisation.id}/review-payment`);
  expect(fixture.status()).toBe(201);
  const { payment } = await fixture.json();
  expect((await page.request.post(`/api/admin/platform-payments/${payment.id}/resolve-review`, { data: { note: 'Non administrateur' } })).status()).toBe(403);
  const beforeReview = (await (await page.request.get(`/api/cotisations/${cotisation.id}`)).json()).cotisation;
  expect(beforeReview.lifecycle.can_extend).toBe(false);
  expect((await request.post('http://127.0.0.1:4001/__test__/users/%2B2250700000091/admin')).status()).toBe(200);

  await page.goto('/admin');
  await expect(page.getByRole('link', { name: /paiement.*examiner/i }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Frais Mastercota', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Frais Mastercota' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frais à vérifier' })).toBeVisible();
  await expect(page.getByText(payment.paystack_reference, { exact: true })).toBeVisible();
  await expect(page.getByText('Le paiement est arrivé après la fin de la prolongation possible.')).toBeVisible();
  await expect(page.getByText('Service appliqué', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Appliqués', exact: true }).click();
  await expect(page.getByText('Aucun paiement pour ce filtre.')).toBeVisible();
  await page.getByRole('button', { name: 'À examiner', exact: true }).click();
  await expect(page.getByText(payment.paystack_reference, { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const closeReview = page.getByRole('button', { name: 'Clôturer l’examen', exact: true });
  await expect(closeReview).toBeDisabled();
  await expect(page.getByText(/Cette note est visible par l’organisateur/)).toBeVisible();
  const conclusion = 'Examen fictif terminé. Contact établi avec l’organisateur ; aucune opération financière exécutée dans ce test.';
  await page.getByLabel('Conclusion de l’examen').fill(conclusion);
  await closeReview.click();
  await expect(page.getByText('Aucun paiement à examiner.')).toBeVisible();
  await page.getByRole('button', { name: 'Examinés', exact: true }).click();
  await expect(page.getByText('Examiné', { exact: true })).toBeVisible();
  await expect(page.getByText(conclusion, { exact: true })).toBeVisible();
  await expect(page.getByText(/Aucun remboursement n’est déclenché par cette action/)).toBeVisible();
  await expect(closeReview).toHaveCount(0);
  await expect(page.getByText('Service appliqué', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tous', exact: true }).click();
  await expect(page.getByText(payment.paystack_reference, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Appliqués', exact: true }).click();
  await expect(page.getByText('Aucun paiement pour ce filtre.')).toBeVisible();

  const repeated = await page.request.post(`/api/admin/platform-payments/${payment.id}/resolve-review`, { data: { note: 'Seconde tentative à ignorer' } });
  expect(repeated.ok()).toBeTruthy();
  const repeatedData = await repeated.json();
  expect(repeatedData.already_resolved).toBe(true);
  expect(repeatedData.payment.review_resolution_note).toBe(conclusion);
  expect(repeatedData.payment.application_status).toBe('review_required');
  expect(repeatedData.payment.status).toBe('paid');

  await page.goto(`/cotisation/${cotisation.id}/frais?ref=${payment.paystack_reference}`);
  await expect(page.getByRole('heading', { name: 'Examen terminé', exact: true })).toBeVisible();
  await expect(page.getByText(conclusion, { exact: true })).toBeVisible();
  await expect(page.getByText('Prolongation activée', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Voir la cotisation', exact: true }).click();
  await expect(page.getByText('Le support a terminé l’examen de votre paiement.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Prolonger \+10/ })).toBeVisible();
  const afterReview = (await (await page.request.get(`/api/cotisations/${cotisation.id}`)).json()).cotisation;
  expect(afterReview.lifecycle.can_extend).toBe(true);
  const retry = await page.request.post(`/api/cotisations/${cotisation.id}/extend`, { data: {} });
  expect(retry.ok(), await retry.text()).toBeTruthy();
  const retryData = await retry.json();
  expect(retryData.payment_required).toBe(true);
  expect(retryData.reference).toMatch(/^[0-9a-f-]{36}$/);
  expect(retryData.reference).not.toBe(payment.paystack_reference);
});
