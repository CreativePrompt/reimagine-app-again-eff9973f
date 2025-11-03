-- Add hero section customization columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hero_image TEXT,
ADD COLUMN IF NOT EXISTS hero_dimming INTEGER DEFAULT 50;