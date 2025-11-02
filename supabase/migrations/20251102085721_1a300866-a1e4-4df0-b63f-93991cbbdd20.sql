-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload backgrounds" ON storage.objects;

-- Create a new policy that allows uploads to the presets folder by anyone
CREATE POLICY "Anyone can upload preset backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'presentation-backgrounds' AND 
  (storage.foldername(name))[1] = 'presets'
);

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'presentation-backgrounds' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[1] != 'presets'
);