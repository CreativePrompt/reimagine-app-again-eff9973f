import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BibleHighlight {
  id: string;
  book: string;
  chapter: number;
  start_offset: number;
  end_offset: number;
  text: string;
  color: string;
}

interface BibleNote {
  id: string;
  book: string;
  chapter: number;
  position_offset: number;
  content: string;
  created_at: string;
  updated_at: string;
}

interface BibleState {
  highlights: BibleHighlight[];
  notes: BibleNote[];
  isLoading: boolean;
  
  loadHighlightsAndNotes: (book: string, chapter: number) => Promise<void>;
  addHighlight: (book: string, chapter: number, text: string, startOffset: number, endOffset: number, color: string) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  updateHighlight: (id: string, color: string) => Promise<void>;
  addNote: (book: string, chapter: number, content: string, offset: number) => Promise<void>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useBibleStore = create<BibleState>((set, get) => ({
  highlights: [],
  notes: [],
  isLoading: false,

  loadHighlightsAndNotes: async (book: string, chapter: number) => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ highlights: [], notes: [], isLoading: false });
        return;
      }

      const [highlightsRes, notesRes] = await Promise.all([
        supabase
          .from('bible_highlights')
          .select('*')
          .eq('book', book)
          .eq('chapter', chapter)
          .order('start_offset', { ascending: true }),
        supabase
          .from('bible_notes')
          .select('*')
          .eq('book', book)
          .eq('chapter', chapter)
          .order('position_offset', { ascending: true }),
      ]);

      if (highlightsRes.error) throw highlightsRes.error;
      if (notesRes.error) throw notesRes.error;

      set({
        highlights: highlightsRes.data || [],
        notes: notesRes.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error loading Bible highlights and notes:', error);
      toast.error('Failed to load highlights and notes');
      set({ isLoading: false });
    }
  },

  addHighlight: async (book: string, chapter: number, text: string, startOffset: number, endOffset: number, color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bible_highlights')
        .insert({
          user_id: user.id,
          book,
          chapter,
          text,
          start_offset: startOffset,
          end_offset: endOffset,
          color,
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        highlights: [...state.highlights, data],
      }));
    } catch (error: any) {
      console.error('Error adding highlight:', error);
      toast.error('Failed to add highlight');
    }
  },

  removeHighlight: async (id: string) => {
    try {
      const { error } = await supabase
        .from('bible_highlights')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        highlights: state.highlights.filter(h => h.id !== id),
      }));
    } catch (error: any) {
      console.error('Error removing highlight:', error);
      toast.error('Failed to remove highlight');
    }
  },

  updateHighlight: async (id: string, color: string) => {
    try {
      const { error } = await supabase
        .from('bible_highlights')
        .update({ color })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        highlights: state.highlights.map(h =>
          h.id === id ? { ...h, color } : h
        ),
      }));
    } catch (error: any) {
      console.error('Error updating highlight:', error);
      toast.error('Failed to update highlight');
    }
  },

  addNote: async (book: string, chapter: number, content: string, offset: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bible_notes')
        .insert({
          user_id: user.id,
          book,
          chapter,
          content,
          position_offset: offset,
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        notes: [...state.notes, data],
      }));

      toast.success('Note added');
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  },

  updateNote: async (id: string, content: string) => {
    try {
      const { error } = await supabase
        .from('bible_notes')
        .update({ content })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        notes: state.notes.map(n =>
          n.id === id ? { ...n, content } : n
        ),
      }));

      toast.success('Note updated');
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  },

  deleteNote: async (id: string) => {
    try {
      const { error } = await supabase
        .from('bible_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
      }));

      toast.success('Note deleted');
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  },
}));
