import { test, expect, type Page } from '@playwright/test';
async function login(page:Page) {
  await page.goto('/auth/phone');
  await page.getByPlaceholder('0700000000').fill('0700000000');
  await page.getByRole('button',{name:'Recevoir le code WhatsApp'}).click();
  await page.getByLabel('Code à 6 chiffres').fill('123456');
  await page.getByRole('button',{name:'Valider et entrer'}).click();
  await expect(page).toHaveURL(/\/profile$/);
}
async function wave(page:Page) {
  await page.goto('/profile/payout');
  await page.getByRole('button',{name:/Avec Wave Business/}).click();
  await page.getByPlaceholder('https://pay.wave.com/m/M_…/c/ci/').fill('https://pay.wave.com/m/M_TEST/c/ci/');
  await page.getByRole('button',{name:/Enregistrer/}).click();
  await expect(page.getByText(/enregistr/i).last()).toBeVisible();
}
async function create(page:Page,title:string,free=true) {
  await page.goto('/cotisation/create');
  await page.getByPlaceholder('Ex. Mariage de Aya').fill(title);
  await page.getByPlaceholder('500000').fill('50000');
  if(free) await page.getByRole('button',{name:'Créer gratuitement'}).click();
  else { await page.getByRole('button',{name:/15 jours/}).click(); await page.getByRole('button',{name:/Continuer ·/}).click(); }
}
test.beforeEach(async({request})=>{await request.post('http://127.0.0.1:4001/__test__/reset');});

test('OTP, Wave setup, free cotisation, public contribution and owner confirmation',async({page,browser})=>{
  await login(page); await wave(page); await create(page,'Cotisation communauté');
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  const detail=page.url(); const id=detail.split('/').at(-1)!;
  const response=await page.request.get(`/api/cotisations/${id}`); const cot=(await response.json()).cotisation;
  const guest=await browser.newContext();
  await guest.route('https://pay.wave.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Wave test uniquement</h1>'}));
  const contribution=await guest.newPage();
  await contribution.goto(`http://localhost:3100/c/${cot.slug}`);
  await contribution.getByLabel('Votre nom').fill('Contributeur test');
  await contribution.getByPlaceholder('0700000000').fill('0100000000');
  await contribution.getByLabel('Montant (FCFA)').fill('5000');
  await contribution.getByRole('button',{name:'Payer avec Wave',exact:true}).click();
  await contribution.getByRole('button',{name:'J’ai payé, prévenir l’organisateur'}).click();
  await expect(contribution.getByText(/signalement|signalé|attente/i).first()).toBeVisible();
  await page.reload();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:/Confirmer/}).first().click();
  await expect.poll(async()=>{const res=await page.request.get(`/api/cotisations/${id}`);return Number((await res.json()).cotisation.current_amount);}).toBe(5000);
  const publicData=await contribution.request.get(`http://localhost:3100/api/cotisations/${id}/contributions`);
  expect(JSON.stringify(await publicData.json())).not.toContain('contributor_phone');
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await guest.close();
});

test('paid cotisation and extension activate through verified callback',async({page,context,request})=>{
  await context.route('https://checkout.paystack.com/**',async route=>{
    const reference=new URL(route.request().url()).pathname.slice(1);
    const res=await request.get(`http://127.0.0.1:4001/__test__/checkout/${reference}`);
    const {callback_url}=await res.json();
    await route.fulfill({status:302,headers:{location:callback_url},body:''});
  });
  await login(page);await wave(page);await create(page,'Cotisation payante',false);
  await expect(page.getByRole('heading',{name:'Paiement confirmé'})).toBeVisible();
  await page.getByRole('link',{name:'Voir la cotisation'}).click();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:/Prolonger \+10/}).click();
  await expect(page.getByText('Prolongation activée')).toBeVisible();
});

test('unauthenticated private pages and admin API are protected',async({page,request})=>{
  await page.goto('/cotisation/create');
  await expect(page).toHaveURL(/\/auth\/phone/);
  expect((await request.get('/api/admin/stats')).status()).toBe(403);
  for(const path of ['/','/frais','/comment-ca-marche','/p/cgu','/p/confidentialite']){
    await page.goto(path);await expect(page.locator('main')).toBeVisible();
  }
});

test('duration selection waits for billing data and keeps the chosen paid offer', async ({ page }) => {
  await login(page);
  await wave(page);
  let release!: () => void;
  const billingReady = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/cotisations/billing-info', async route => {
    await billingReady;
    await route.continue();
  });
  try {
    await page.goto('/cotisation/create');
    await expect(page.getByText('Chargement des offres…')).toBeVisible();
    await expect(page.getByRole('button', { name: /15 jours/ })).toBeDisabled();
  } finally {
    release();
  }
  const duration = page.getByRole('button', { name: /15 jours/ });
  await expect(duration).toBeEnabled();
  await duration.click();
  await expect(duration).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Continuer ·/ })).toBeVisible();
});

test('drafts survive polling and another editor must be reconciled before saving', async ({ page }) => {
  await login(page); await wave(page); await create(page, 'Édition partagée');
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  const id = page.url().split('/').at(-1)!;
  await page.getByRole('tab', { name: 'Modifier', exact: true }).click();
  await page.getByLabel('Titre', { exact: true }).fill('Mon titre en cours');
  await page.getByLabel('Description', { exact: true }).fill('Ma description en cours');
  await page.getByLabel('Objectif (FCFA)').fill('70000');
  const update = await page.request.patch(`/api/cotisations/${id}`, { data: { title: 'Titre depuis un autre écran' } });
  expect(update.ok()).toBeTruthy();
  await expect(page.getByText('Ces informations ont changé sur un autre écran. Votre saisie est conservée.')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Titre', { exact: true })).toHaveValue('Mon titre en cours');
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Ma description en cours');
  await expect(page.getByLabel('Objectif (FCFA)')).toHaveValue('70000');
  await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Garder ma saisie', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mon titre en cours', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Réglages', exact: true }).click();
  await page.getByLabel('Message de partage').fill('Mon message en cours');
  expect((await page.request.patch(`/api/cotisations/${id}`, { data: { settings: { show_progress: false } } })).ok()).toBeTruthy();
  await expect(page.getByText('Les réglages ont changé sur un autre écran. Vos choix sont conservés.')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Message de partage')).toHaveValue('Mon message en cours');
  await page.getByRole('button', { name: 'Charger les réglages à jour' }).click();
  await expect(page.getByRole('switch', { name: 'Afficher la progression' })).not.toBeChecked();
  await expect(page.getByLabel('Message de partage')).toHaveValue('');
});

test('creation resumes after a lost response without consuming a second cotisation', async ({ page }) => {
  await login(page); await wave(page);
  const requestIds: string[] = [];
  let loseResponse = true;
  await page.route('**/api/cotisations', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    requestIds.push(route.request().postDataJSON().request_id);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    if (loseResponse) { loseResponse = false; await route.abort('connectionreset'); }
    else await route.fulfill({ response });
  });
  await create(page, 'Création résiliente');
  await expect(page.getByRole('button', { name: 'Reprendre la création' })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre la création' }).click();
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  expect(requestIds).toHaveLength(2);
  expect(requestIds[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(requestIds[1]).toBe(requestIds[0]);
  const cots = await (await page.request.get('/api/cotisations')).json();
  expect(cots.cotisations.filter((c: { title: string }) => c.title === 'Création résiliente')).toHaveLength(1);
});

test('manual retry survives reload, goal increase reopens, and explicit closure remains reversible', async ({ page }) => {
  await login(page); await wave(page); await create(page, 'Cycle organisateur');
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  const id = page.url().split('/').at(-1)!;
  const requestIds: string[] = [];
  let loseResponse = true;
  await page.route(`**/api/cotisations/${id}/contributions`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    requestIds.push(route.request().postDataJSON().request_id);
    const response = await route.fetch();
    expect(response.ok()).toBeTruthy();
    if (loseResponse) { loseResponse = false; await route.abort('connectionreset'); }
    else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Contribution manuelle', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Versement reçu');
  await page.getByPlaceholder('0700000000').fill('0100000000');
  await page.getByLabel('Montant (FCFA)', { exact: true }).fill('50000');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Réessayer l’enregistrement' })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Contribution manuelle', exact: true }).click();
  await page.getByRole('button', { name: 'Réessayer l’enregistrement' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(requestIds).toHaveLength(2);
  expect(requestIds[1]).toBe(requestIds[0]);
  const data = await (await page.request.get(`/api/cotisations/${id}`)).json();
  expect(Number(data.cotisation.current_amount)).toBe(50000);
  expect(data.cotisation.status).toBe('completed');
  expect((await (await page.request.get(`/api/cotisations/${id}/contributions`)).json()).contributions).toHaveLength(1);
  await page.getByRole('tab', { name: 'Modifier', exact: true }).click();
  await page.getByLabel('Objectif (FCFA)').fill('60000');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Clôturer', exact: true })).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clôturer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Réouvrir', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Réouvrir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Clôturer', exact: true })).toBeVisible();
});

test('a Wave transfer can be reported after closure and page reload without reopening payment', async ({ page, browser }) => {
  await login(page); await wave(page); await create(page, 'Retour Wave tardif');
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  const id = page.url().split('/').at(-1)!;
  const cot = (await (await page.request.get(`/api/cotisations/${id}`)).json()).cotisation;
  const guest = await browser.newContext();
  await guest.route('https://pay.wave.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Wave simulé</h1>' }));
  const contribution = await guest.newPage();
  await contribution.goto(`http://localhost:3100/c/${cot.slug}`);
  await contribution.getByLabel('Votre nom').fill('Transfert avant fermeture');
  await contribution.getByPlaceholder('0700000000').fill('0100000000');
  await contribution.getByLabel('Montant (FCFA)').fill('5000');
  await contribution.getByRole('button', { name: 'Payer avec Wave', exact: true }).click();
  expect((await page.request.patch(`/api/cotisations/${id}`, { data: { status: 'closed' } })).ok()).toBeTruthy();
  await contribution.reload();
  await expect(contribution.getByRole('heading', { name: 'Vous avez déjà payé ?' })).toBeVisible();
  await expect(contribution.getByRole('button', { name: 'Payer via Wave', exact: true })).not.toBeVisible();
  await contribution.getByRole('button', { name: 'J’ai payé, prévenir l’organisateur' }).click();
  await expect(contribution.getByText('est en attente de confirmation.', { exact: false }).first()).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect.poll(async () => Number((await (await page.request.get(`/api/cotisations/${id}`)).json()).cotisation.current_amount)).toBe(5000);
  expect((await (await page.request.get(`/api/cotisations/${id}`)).json()).cotisation.status).toBe('closed');
  await guest.close();
});

test('payment return only confirms an applied service and exposes pending, failure and review', async ({ page }) => {
  await login(page);
  const cases = [
    { key: 'pending', status: 'pending', application_status: 'pending', paystack_status: 'pending', heading: 'Vérification…' },
    { key: 'failed', status: 'failed', application_status: 'pending', paystack_status: 'failed', heading: 'Paiement non effectué' },
    { key: 'review', status: 'paid', application_status: 'review_required', paystack_status: 'success', heading: 'Paiement à régulariser' },
    { key: 'reviewed', status: 'paid', application_status: 'review_required', review_resolved_at: '2026-10-06T12:00:00Z', paystack_status: 'success', heading: 'Examen terminé' },
    { key: 'applied', status: 'paid', application_status: 'applied', paystack_status: 'success', heading: 'Paiement confirmé' },
  ];
  for (const scenario of cases) {
    await page.route(`**/api/platform-payments/verify/test-${scenario.key}`, route => route.fulfill({ json: { paystack_status: scenario.paystack_status, payment: { status: scenario.status, application_status: scenario.application_status, review_resolved_at: scenario.review_resolved_at ?? null, review_resolution_note: scenario.key === 'reviewed' ? 'Conclusion fictive du support' : null, amount: 2000, purpose: 'extend' } } }));
    await page.goto(`/cotisation/00000000-0000-4000-8000-000000000000/frais?ref=test-${scenario.key}`);
    await expect(page.getByRole('heading', { name: scenario.heading, exact: true })).toBeVisible();
    if (scenario.key !== 'applied') await expect(page.getByText('Prolongation activée', { exact: true })).not.toBeVisible();
    if (scenario.key === 'review') {
      await expect(page.getByText(/Ne payez pas une seconde fois/)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Contacter le support' })).toHaveAttribute('href', '/profile#support');
    }
  }
});

test('extension and reopen actions follow expiry and duration eligibility', async ({ page, request }) => {
  await login(page); await wave(page); await create(page, 'Échéance');
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  const id = page.url().split('/').at(-1)!;
  expect((await request.post(`http://127.0.0.1:4001/__test__/cotisations/${id}/expire`, { data: { daysAgo: 1 } })).ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Réouvrir', exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Prolonger \+10/ })).toBeVisible();
  expect((await request.post(`http://127.0.0.1:4001/__test__/cotisations/${id}/expire`, { data: { daysAgo: 15 } })).ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('button', { name: /Prolonger \+10/ })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Contribution manuelle', exact: true })).toBeEnabled();
});

test('stale public pages cannot start Wave with old payout details or a changed minimum', async ({ page, browser }) => {
  await login(page); await wave(page); await create(page, 'Coordonnées à jour');
  await expect(page).toHaveURL(/\/cotisation\/[0-9a-f-]+$/);
  const id = page.url().split('/').at(-1)!;
  const cot = (await (await page.request.get(`/api/cotisations/${id}`)).json()).cotisation;
  const guest = await browser.newContext();
  let waveRequests = 0;
  await guest.route('https://pay.wave.com/**', route => { waveRequests++; return route.fulfill({ body: 'Wave simulé' }); });
  const contribution = await guest.newPage();
  await contribution.goto(`http://localhost:3100/c/${cot.slug}`);
  await contribution.getByLabel('Votre nom').fill('Transfert protégé');
  await contribution.getByPlaceholder('0700000000').fill('0100000000');
  await contribution.getByLabel('Montant (FCFA)').fill('5000');
  expect((await page.request.patch(`/api/cotisations/${id}`, { data: { settings: { min_amount: 10000 } } })).ok()).toBeTruthy();
  await contribution.getByRole('button', { name: 'Payer avec Wave', exact: true }).click();
  await expect(contribution.getByText(/Le minimum a changé/)).toBeVisible();
  expect(waveRequests).toBe(0);
  expect((await page.request.patch(`/api/cotisations/${id}`, { data: { settings: { min_amount: 0 } } })).ok()).toBeTruthy();
  expect((await page.request.patch('/api/profile', { data: { wave_payout_mode: 'business', wave_pay_link: 'https://pay.wave.com/m/M_CHANGED/c/ci/', wave_phone: null } })).ok()).toBeTruthy();
  await contribution.getByRole('button', { name: 'Payer avec Wave', exact: true }).click();
  await expect(contribution.getByText('Les coordonnées Wave ont changé. Actualisez cette page avant de payer.')).toBeVisible();
  expect(waveRequests).toBe(0);
  await guest.close();
});
