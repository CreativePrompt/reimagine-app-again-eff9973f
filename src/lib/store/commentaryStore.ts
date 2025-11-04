import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Commentary {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  pdf_url: string;
  cover_image_url?: string;
  extracted_text?: string;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  commentary_id: string;
  user_id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  created_at: string;
}

interface CommentaryStore {
  commentaries: Commentary[];
  isLoading: boolean;
  loadCommentaries: () => Promise<void>;
  createCommentary: (commentary: Omit<Commentary, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Commentary | null>;
  deleteCommentary: (id: string) => Promise<void>;
}

export const useCommentaryStore = create<CommentaryStore>((set) => ({
  commentaries: [],
  isLoading: false,

  loadCommentaries: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('commentaries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading commentaries:', error);
      set({ isLoading: false });
      return;
    }

    set({ commentaries: data || [], isLoading: false });
  },

  createCommentary: async (commentary) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('commentaries')
      .insert({
        ...commentary,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating commentary:', error);
      return null;
    }

    set((state) => ({
      commentaries: [data, ...state.commentaries],
    }));

    return data;
  },

  deleteCommentary: async (id) => {
    const { error } = await supabase
      .from('commentaries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting commentary:', error);
      return;
    }

    set((state) => ({
      commentaries: state.commentaries.filter((c) => c.id !== id),
    }));
  },
}));