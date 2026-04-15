-- Profile avatar storage bucket + RLS policies
-- Users can upload/update/delete their own avatar; public read for display.

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');
