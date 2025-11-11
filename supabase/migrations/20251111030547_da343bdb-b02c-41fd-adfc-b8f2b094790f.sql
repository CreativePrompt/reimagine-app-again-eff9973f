-- Add commentary notes table
CREATE TABLE IF NOT EXISTS public.commentary_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commentary_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  position_offset INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commentary_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
CREATE POLICY "Users can view their own notes"
ON public.commentary_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.commentary_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.commentary_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.commentary_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Add update policy for highlights (currently missing)
CREATE POLICY "Users can update their own highlights"
ON public.commentary_highlights
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for notes updated_at
CREATE TRIGGER update_commentary_notes_updated_at
BEFORE UPDATE ON public.commentary_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();