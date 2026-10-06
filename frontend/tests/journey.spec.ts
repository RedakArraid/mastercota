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
