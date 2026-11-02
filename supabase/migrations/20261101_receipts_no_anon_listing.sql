-- Stop anonymous listing of the receipts bucket.
--
-- "receipts_public_read" let the anon role SELECT every row in storage.objects for this
-- bucket, so anyone with the public anon key could list all users' receipt files.
-- The app only shows receipts through public URLs (getPublicUrl), and Supabase serves
-- public-bucket files without consulting storage.objects policies, so images keep working.
-- Signed-in users still see their own files through "receipts_select_own".
DROP POLICY IF EXISTS "receipts_public_read" ON storage.objects;
