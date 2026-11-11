-- Isolated only. Legacy unbound receipt rows remain held, never inferred.
BEGIN;
ALTER TABLE cf_unmatched_receipt ADD COLUMN channel_id uuid;
ALTER TABLE cf_delivery_receipt ADD COLUMN channel_id uuid;
UPDATE cf_unmatched_receipt SET state='held' WHERE channel_id IS NULL;
COMMIT;
