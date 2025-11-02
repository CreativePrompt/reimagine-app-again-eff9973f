-- Add pages column to sermons table
ALTER TABLE public.sermons 
ADD COLUMN IF NOT EXISTS pages jsonb DEFAULT '[]'::jsonb;