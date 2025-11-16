-- Create bible_highlights table
CREATE TABLE public.bible_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for bible_highlights
ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bible_highlights
CREATE POLICY "Users can view their own highlights" 
ON public.bible_highlights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own highlights" 
ON public.bible_highlights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights" 
ON public.bible_highlights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights" 
ON public.bible_highlights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create bible_notes table
CREATE TABLE public.bible_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  position_offset INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for bible_notes
ALTER TABLE public.bible_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bible_notes
CREATE POLICY "Users can view their own notes" 
ON public.bible_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON public.bible_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.bible_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.bible_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_bible_notes_updated_at
BEFORE UPDATE ON public.bible_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();