-- Create storage bucket for spotlight backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('spotlight-backgrounds', 'spotlight-backgrounds', true);

-- Policy to allow authenticated users to upload their own backgrounds
CREATE POLICY "Users can upload spotlight backgrounds"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'spotlight-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to view all spotlight backgrounds (public bucket)
CREATE POLICY "Anyone can view spotlight backgrounds"
ON storage.objects
FOR SELECT
USING (bucket_id = 'spotlight-backgrounds');

-- Policy to allow users to delete their own backgrounds
CREATE POLICY "Users can delete their own spotlight backgrounds"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'spotlight-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);