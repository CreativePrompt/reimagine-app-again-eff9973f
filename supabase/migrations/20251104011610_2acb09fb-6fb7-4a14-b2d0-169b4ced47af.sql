-- Create commentaries table
CREATE TABLE public.commentaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  pdf_url TEXT NOT NULL,
  cover_image_url TEXT,
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commentaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own commentaries" 
ON public.commentaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own commentaries" 
ON public.commentaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commentaries" 
ON public.commentaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commentaries" 
ON public.commentaries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create commentary_highlights table
CREATE TABLE public.commentary_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commentary_id UUID NOT NULL REFERENCES public.commentaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commentary_highlights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own highlights" 
ON public.commentary_highlights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own highlights" 
ON public.commentary_highlights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights" 
ON public.commentary_highlights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('commentary-pdfs', 'commentary-pdfs', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('commentary-covers', 'commentary-covers', true);

-- Storage policies for PDFs (private)
CREATE POLICY "Users can view their own PDFs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'commentary-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'commentary-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'commentary-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for covers (public)
CREATE POLICY "Cover images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'commentary-covers');

CREATE POLICY "Users can upload their own covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'commentary-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own covers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'commentary-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
CREATE TRIGGER update_commentaries_updated_at
BEFORE UPDATE ON public.commentaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();