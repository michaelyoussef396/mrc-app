-- Allow authenticated users to delete contact-attempt activity rows.
--
-- The `activities` table previously had only INSERT and SELECT policies, so the
-- "remove last contact attempt" button (deleteLastContactAttempt) was silently
-- blocked by RLS (0 rows affected, no error). This adds a DELETE policy scoped
-- strictly to activity_type = 'contact_attempt' so genuine audit rows
-- (field_edit, status_changed, note_added, section_milestone) remain
-- undeletable. Mirrors the existing permissive authenticated INSERT/SELECT style.
--
-- Rollback:
--   DROP POLICY "Authenticated users can delete contact attempts" ON public.activities;

CREATE POLICY "Authenticated users can delete contact attempts"
  ON public.activities
  FOR DELETE
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND activity_type = 'contact_attempt'
  );
