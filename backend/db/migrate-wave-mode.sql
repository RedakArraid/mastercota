-- Mode d'encaissement Wave : business (lien) | phone (numéro)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wave_payout_mode text
  CHECK (wave_payout_mode IS NULL OR wave_payout_mode IN ('business', 'phone'));

UPDATE users
SET wave_payout_mode = 'business'
WHERE wave_pay_link IS NOT NULL AND wave_pay_link <> ''
  AND (wave_payout_mode IS NULL OR wave_payout_mode = '');

UPDATE users
SET wave_payout_mode = 'phone'
WHERE wave_phone IS NOT NULL AND wave_phone <> ''
  AND wave_payout_mode IS NULL
  AND (wave_pay_link IS NULL OR wave_pay_link = '');
