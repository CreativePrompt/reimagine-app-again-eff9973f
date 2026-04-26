import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface NoteBookmark {
  id: string;
  label: string;
  abbreviation?: string;
  color: string; // preset id e.g. "rose" (see BOOKMARK_COLORS)
  order: number;
  /** Character offset into plain-text of the note (preferred). */
  offset?: number;
  /** Snippet of nearby text used as a fallback when offsets drift. */
  snippet?: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  bookmarks?: NoteBookmark[];
  created_at: string;
  updated_at: string;
}

interface NotesStore {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  loadNotes: () => Promise<void>;
  createNote: () => Promise<Note | null>;
  duplicateNote: (id: string) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
}

function normalizeNote(row: any): Note {
  return {
    ...row,
    bookmarks: Array.isArray(row?.bookmarks) ? (row.bookmarks as NoteBookmark[]) : [],
  } as Note;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ notes: (data || []).map(normalizeNote) });
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createNote: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'Untitled Note',
          content: '',
          tags: []
        })
        .select()
        .single();

      if (error) throw error;

      const note = normalizeNote(data);
      set((state) => ({
        notes: [note, ...state.notes],
        currentNote: note
      }));

      return note;
    } catch (error) {
      console.error('Error creating note:', error);
      return null;
    }
  },

  duplicateNote: async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const original = get().notes.find((n) => n.id === id);
      if (!original) return null;

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: `${original.title} (Copy)`,
          content: original.content,
          tags: original.tags || [],
          bookmarks: (original.bookmarks || []) as unknown as never,
        })
        .select()
        .single();

      if (error) throw error;

      const note = normalizeNote(data);
      set((state) => ({
        notes: [note, ...state.notes],
      }));

      return note;
    } catch (error) {
      console.error('Error duplicating note:', error);
      return null;
    }
  },

  updateNote: async (id: string, updates: Partial<Note>) => {
    try {
      const { bookmarks, ...rest } = updates;
      const dbUpdates: Record<string, unknown> = { ...rest };
      if (bookmarks !== undefined) dbUpdates.bookmarks = bookmarks;

      const { error } = await supabase
        .from('notes')
        .update(dbUpdates as never)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
        ),
        currentNote: state.currentNote?.id === id 
          ? { ...state.currentNote, ...updates, updated_at: new Date().toISOString() }
          : state.currentNote
      }));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  },

  deleteNote: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote
      }));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  },

  setCurrentNote: (note: Note | null) => {
    set({ currentNote: note });
  }
}));