-- Lien de paiement Wave (ouvre l'app avec montant prérempli)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wave_pay_link text;
