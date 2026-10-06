ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS request_payload jsonb;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS edit_version integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS cotisations_request_idx ON cotisations(owner_id, request_id) WHERE request_id IS NOT NULL;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS close_reason text CHECK (close_reason IN ('manual', 'expired'));
-- Historical closures cannot be distinguished reliably; preserve them until an explicit reopening.
UPDATE cotisations SET close_reason = 'manual' WHERE status = 'closed' AND close_reason IS NULL;

ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS application_status text NOT NULL DEFAULT 'pending'
  CHECK (application_status IN ('pending', 'applied', 'review_required'));
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS review_reason text;
UPDATE platform_payments SET application_status = CASE WHEN metadata->>'duplicate' = 'true' THEN 'review_required' ELSE 'applied' END,
  review_reason = CASE WHEN metadata->>'duplicate' = 'true' THEN 'duplicate_service' END WHERE status = 'paid';

CREATE OR REPLACE FUNCTION update_cotisation_amount()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE cotisations SET current_amount = current_amount + NEW.amount,
      status = CASE
        WHEN status = 'active' AND deadline < CURRENT_DATE THEN 'closed'
        WHEN status = 'active' AND current_amount + NEW.amount >= target_amount THEN 'completed'
        ELSE status END,
      close_reason = CASE WHEN status = 'active' AND deadline < CURRENT_DATE THEN 'expired' ELSE close_reason END
    WHERE id = NEW.cotisation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
