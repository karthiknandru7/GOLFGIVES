-- ============================================================
-- STORAGE SETUP — Run in Supabase SQL Editor
-- Creates the bucket for winner proof uploads
-- ============================================================

-- Create the storage bucket for winner proof screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('winner-proofs', 'winner-proofs', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: winners can upload their own proof
CREATE POLICY "Winners upload own proof"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'winner-proofs'
    AND auth.uid() IS NOT NULL
  );

-- Storage policy: anyone can view proof files (admin needs to view)
CREATE POLICY "Public read proof files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'winner-proofs');

-- Storage policy: admins can delete proof files
CREATE POLICY "Admins delete proof files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'winner-proofs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
