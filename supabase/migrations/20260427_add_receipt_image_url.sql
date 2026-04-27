-- Add receipt_image_url column to income and expenses tables
ALTER TABLE income ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Create receipts storage bucket (public, 10MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can upload to their own folder only
CREATE POLICY "receipts_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can read their own receipts
CREATE POLICY "receipts_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: public read for display (images are accessed by URL in the app)
CREATE POLICY "receipts_public_read"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'receipts');

-- RLS: users can delete their own receipts
CREATE POLICY "receipts_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
