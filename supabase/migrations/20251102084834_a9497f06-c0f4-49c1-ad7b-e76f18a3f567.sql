-- Create a public storage bucket for presentation backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentation-backgrounds',
  'presentation-backgrounds',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for the bucket
-- Allow anyone to read the preset backgrounds
CREATE POLICY "Public Access for Presentation Backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'presentation-backgrounds');

-- Allow authenticated users to upload backgrounds (for future custom uploads)
CREATE POLICY "Authenticated users can upload backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'presentation-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own uploaded backgrounds
CREATE POLICY "Users can update own backgrounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'presentation-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploaded backgrounds
CREATE POLICY "Users can delete own backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'presentation-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);