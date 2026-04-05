-- Migration: Cleanup duplicate index + tighten app_settings RLS
-- Date: 2026-04-05
-- Context: Post-audit cleanup. Database score improved from 68/100 to 91/100.
--          This migration addresses the 2 remaining safe fixes.

-- Fix A: Drop redundant index on editable_fields
-- The unique constraint editable_fields_field_key_key already provides a btree lookup on field_key.
-- The additional non-unique index idx_editable_fields_key is redundant.
DROP INDEX IF EXISTS idx_editable_fields_key;

-- Fix B: Tighten app_settings RLS
-- OLD: Any authenticated user had full CRUD (authenticated_manage_app_settings)
-- NEW: Any authenticated can READ, only admin can WRITE
-- Reason: app_settings controls inspection number sequencing. Non-admins should not modify it.
DROP POLICY IF EXISTS "authenticated_manage_app_settings" ON app_settings;

CREATE POLICY "authenticated_read_app_settings" ON app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage_app_settings" ON app_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
