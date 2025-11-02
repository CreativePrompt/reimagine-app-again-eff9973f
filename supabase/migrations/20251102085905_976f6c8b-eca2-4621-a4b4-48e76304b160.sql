-- Drop all existing INSERT policies for the background bucket
DROP POLICY IF EXISTS "Authenticated users can upload backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload preset backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;

-- Create a unified policy that allows:
-- 1. Anyone to upload to presets folder
-- 2. Authenticated users to upload to their own folder
CREATE POLICY "Upload backgrounds policy"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'presentation-backgrounds' AND 
  (
    -- Allow uploads to presets folder
    (storage.foldername(name))[1] = 'presets'
    OR
    -- Allow authenticated users to upload to their own folder
    (auth.uid()::text = (storage.foldername(name))[1] AND (storage.foldername(name))[1] != 'presets')
  )
);