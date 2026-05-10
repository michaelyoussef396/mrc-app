-- Phase 4 Stage 4.3 — soft-delete on photos
--
-- Adds deleted_at TIMESTAMPTZ to public.photos so deleteInspectionPhoto() can
-- become an UPDATE rather than a hard DELETE. Plan v2 §4.3 (companion audit:
-- docs/stage-4.3-consumer-audit.md, signed off PR #51).
--
-- Why the partial index: every read consumer (14 of them) gets
-- `WHERE deleted_at IS NULL` after this migration. A partial index covering
-- the most common scope (inspection_id + photo_type) keeps the predicate
-- effectively free.
--
-- Why the FK ALTER: photos.moisture_reading_id is the only ON DELETE CASCADE
-- on photos. Tech-form deletions of moisture_readings (TechnicianInspectionForm
-- .tsx:3478 + cascade via :3418) currently hard-delete linked photos via
-- the cascade, bypassing soft-delete entirely. Aligning this FK with the 4
-- other photo FKs (all SET NULL) lets soft-delete govern photo lifecycle
-- end-to-end. Pre-flight: 3 production photos have moisture_reading_id set,
-- all with valid parent rows — ADD CONSTRAINT will validate cleanly.

ALTER TABLE public.photos ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_photos_active
  ON public.photos(inspection_id, photo_type)
  WHERE deleted_at IS NULL;

ALTER TABLE public.photos DROP CONSTRAINT photos_moisture_reading_id_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_moisture_reading_id_fkey
  FOREIGN KEY (moisture_reading_id)
  REFERENCES public.moisture_readings(id)
  ON DELETE SET NULL;
