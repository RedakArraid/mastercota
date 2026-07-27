-- Wave P2P : numéro orga + contributions en attente de confirmation

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wave_phone text;

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_status_check;
ALTER TABLE contributions
  ADD CONSTRAINT contributions_status_check
  CHECK (status IN (
    'pending',
    'awaiting_confirmation',
    'paid',
    'failed',
    'rejected'
  ));
