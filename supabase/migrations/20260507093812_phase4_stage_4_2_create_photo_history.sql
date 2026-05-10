-- Phase 4 Stage 4.2: photo_history table.
-- Domain-level history of meaningful photo lifecycle events (added,
-- caption_changed, reordered, reattached, category_changed, deleted).
-- Coexists with audit_logs (raw before/after via triggers on photos) — same
-- separation pattern as activities vs audit_logs. Application-layer writes
-- only; no trigger.
--
-- photo_id deliberately has NO FK so deleted photos retain history.

CREATE TABLE public.photo_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      UUID NOT NULL,
  inspection_id UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('added', 'deleted', 'caption_changed', 'reordered', 'reattached', 'category_changed')),
  before        JSONB,
  after         JSONB,
  changed_by    UUID REFERENCES auth.users(id),
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_history_photo
  ON public.photo_history(photo_id, changed_at DESC);
CREATE INDEX idx_photo_history_inspection
  ON public.photo_history(inspection_id, changed_at DESC);

ALTER TABLE public.photo_history ENABLE ROW LEVEL SECURITY;

-- RLS: mirrors public.photos predicates so any actor permitted to INSERT a
-- photo is permitted to record its history. Plan v2 referenced
-- ai_summary_versions, but that table is Edge-Function-written via service
-- role — photo_history is technician-session-written, so the photos
-- predicate is the symmetric one.

-- Admin: full access (mirror of photos.admin_all_photos using is_admin())
CREATE POLICY admin_all_photo_history ON public.photo_history
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Technician INSERT: must be assigned to the parent inspection's lead.
-- (Mirror of photos.tech_insert_photos write predicate, scoped by inspection_id.)
CREATE POLICY tech_insert_photo_history ON public.photo_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photo_history.inspection_id
        AND l.assigned_to = auth.uid()
    )
  );

-- Technician SELECT: same predicate as INSERT.
CREATE POLICY tech_select_photo_history ON public.photo_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photo_history.inspection_id
        AND l.assigned_to = auth.uid()
    )
  );

-- No tech UPDATE/DELETE policies: photo_history is append-only by design.
-- Admins retain full access via admin_all_photo_history if a row needs
-- correction.
