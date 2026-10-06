-- Closing a support review records an administrative decision, not a refund or a new service delivery.
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS review_resolved_at timestamptz;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS review_resolved_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS review_resolution_note text;
ALTER TABLE platform_payments ADD CONSTRAINT platform_payments_review_resolution_check
  CHECK (review_resolved_at IS NULL OR (application_status='review_required' AND review_resolution_note IS NOT NULL AND length(trim(review_resolution_note)) BETWEEN 1 AND 2000));
