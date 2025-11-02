import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Sermon, SermonBlock, BlockKind } from "../blockTypes";
import { nanoid } from "nanoid";
import { supabase } from "@/integrations/supabase/client";
import { TEMPLATES } from "../templates";

interface SermonState {
  sermons: Sermon[];
  currentSermon: Sermon | null;
  isLoading: boolean;
  
  // Actions
  loadUserSermons: () => Promise<void>;
  loadSermon: (id: string) => Promise<void>;
  createSermon: (title?: string, subtitle?: string) => Promise<Sermon>;
  createSermonFromTemplate: (templateKey?: string) => Promise<Sermon>;
  updateSermon: (id: string, updates: Partial<Sermon>) => Promise<void>;
  deleteSermon: (id: string) => Promise<void>;
  
  // Block actions
  addBlock: (kind: BlockKind, afterBlockId?: string, pageId?: string) => void;
  updateBlock: (blockId: string, updates: Partial<SermonBlock>) => void;
  deleteBlock: (blockId: string) => void;
  reorderBlocks: (blockId: string, newOrder: number) => void;
  
  // Current sermon
  setCurrentSermon: (sermon: Sermon | null) => void;
  saveCurrentSermon: () => Promise<void>;
}

export const useSermonStore = create<SermonState>()(
  immer((set, get) => ({
    sermons: [],
    currentSermon: null,
    isLoading: false,

    loadUserSermons: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from("sermons")
          .select("*")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        set({
          sermons: (data || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            title: s.title,
            subtitle: s.subtitle,
            blocks: typeof s.blocks === 'string' ? JSON.parse(s.blocks) : s.blocks,
            pages: s.pages ? (typeof s.pages === 'string' ? JSON.parse(s.pages) : s.pages) : [],
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          })),
        });
      } catch (error) {
        console.error("Error loading sermons:", error);
      } finally {
        set({ isLoading: false });
      }
    },

    loadSermon: async (id: string) => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from("sermons")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        const sermon: Sermon = {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          subtitle: data.subtitle,
          blocks: typeof data.blocks === 'string' ? JSON.parse(data.blocks) : data.blocks,
          pages: (data as any).pages ? (typeof (data as any).pages === 'string' ? JSON.parse((data as any).pages) : (data as any).pages) : [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        set({ currentSermon: sermon });
      } catch (error) {
        console.error("Error loading sermon:", error);
      } finally {
        set({ isLoading: false });
      }
    },

    createSermon: async (title = "Untitled Sermon", subtitle = "") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newSermon: Partial<Sermon> = {
        title,
        subtitle,
        blocks: [],
        pages: [],
      };

      const { data, error } = await supabase
        .from("sermons")
        .insert({
          user_id: user.id,
          title: newSermon.title,
          subtitle: newSermon.subtitle,
          blocks: JSON.stringify(newSermon.blocks || []),
          pages: JSON.stringify(newSermon.pages || []),
        })
        .select()
        .single();

      if (error) throw error;

        const sermon: Sermon = {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          subtitle: data.subtitle,
          blocks: typeof data.blocks === 'string' ? JSON.parse(data.blocks) : data.blocks,
          pages: (data as any).pages ? (typeof (data as any).pages === 'string' ? JSON.parse((data as any).pages) : (data as any).pages) : [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

      set((state) => {
        state.sermons.unshift(sermon);
        state.currentSermon = sermon;
      });

      return sermon;
    },

    createSermonFromTemplate: async (templateKey = "blank") => {
      const template = TEMPLATES.find((t) => t.key === templateKey) || TEMPLATES[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const blocks: SermonBlock[] = template.blocks.map((seed, index) => {
        const baseBlock = {
          id: nanoid(),
          kind: seed.kind,
          order: index,
        };

        switch (seed.kind) {
          case "point":
            return {
              ...baseBlock,
              kind: "point" as const,
              title: seed.title || "Untitled Point",
              body: seed.body || "",
              number: null,
            };
          case "bible":
            return {
              ...baseBlock,
              kind: "bible" as const,
              reference: seed.reference || "",
              text: seed.text || "",
            };
          case "illustration":
            return {
              ...baseBlock,
              kind: "illustration" as const,
              title: seed.title || "Illustration",
              body: seed.body || "",
            };
          case "application":
            return {
              ...baseBlock,
              kind: "application" as const,
              title: seed.title || "Application",
              body: seed.body || "",
            };
          case "quote":
            return {
              ...baseBlock,
              kind: "quote" as const,
              text: seed.text || "",
            };
          case "custom":
            return {
              ...baseBlock,
              kind: "custom" as const,
              title: seed.title || "Custom Block",
              body: seed.body || "",
            };
          case "reader_note":
            return {
              ...baseBlock,
              kind: "reader_note" as const,
              title: seed.title || "Reader's Note",
              summary: seed.body || "",
            };
          default:
            return {
              ...baseBlock,
              kind: "custom" as const,
              title: "Custom Block",
              body: "",
            };
        }
      });

      const { data, error } = await supabase
        .from("sermons")
        .insert({
          user_id: user.id,
          title: template.name,
          subtitle: template.description,
          blocks: JSON.stringify(blocks),
        })
        .select()
        .single();

      if (error) throw error;

      const sermon: Sermon = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        subtitle: data.subtitle,
        blocks: typeof data.blocks === 'string' ? JSON.parse(data.blocks) : data.blocks,
        pages: (data as any).pages ? (typeof (data as any).pages === 'string' ? JSON.parse((data as any).pages) : (data as any).pages) : [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      set((state) => {
        state.sermons.unshift(sermon);
        state.currentSermon = sermon;
      });

      return sermon;
    },

    updateSermon: async (id: string, updates: Partial<Sermon>) => {
      const { error } = await supabase
        .from("sermons")
        .update({
          title: updates.title,
          subtitle: updates.subtitle,
          blocks: updates.blocks ? JSON.stringify(updates.blocks) : undefined,
          pages: updates.pages ? JSON.stringify(updates.pages) : undefined,
        })
        .eq("id", id);

      if (error) throw error;

      set((state) => {
        const index = state.sermons.findIndex((s) => s.id === id);
        if (index !== -1) {
          state.sermons[index] = { ...state.sermons[index], ...updates };
        }
        if (state.currentSermon?.id === id) {
          state.currentSermon = { ...state.currentSermon, ...updates };
        }
      });
    },

    deleteSermon: async (id: string) => {
      const { error } = await supabase.from("sermons").delete().eq("id", id);

      if (error) throw error;

      set((state) => {
        state.sermons = state.sermons.filter((s) => s.id !== id);
        if (state.currentSermon?.id === id) {
          state.currentSermon = null;
        }
      });
    },

    addBlock: (kind: BlockKind, afterBlockId?: string, pageId?: string) => {
      set((state) => {
        if (!state.currentSermon) return;

        const newBlock: any = {
          id: nanoid(),
          kind,
          order: state.currentSermon.blocks.length,
          ...(pageId && { pageId }),
        };

        // Initialize block based on kind
        switch (kind) {
          case "point":
            newBlock.title = "New Point";
            newBlock.body = "";
            break;
          case "bible":
            newBlock.reference = "";
            newBlock.text = "";
            break;
          case "illustration":
            newBlock.title = "Illustration";
            newBlock.body = "";
            break;
          case "application":
            newBlock.title = "Application";
            newBlock.body = "";
            break;
          case "quote":
            newBlock.text = "";
            break;
          case "media":
            newBlock.url = "";
            newBlock.type = "image";
            break;
          case "custom":
            newBlock.title = "Custom Block";
            newBlock.body = "";
            break;
          case "reader_note":
            newBlock.title = "Reader's Note";
            newBlock.summary = "";
            break;
        }

        if (afterBlockId) {
          const afterIndex = state.currentSermon.blocks.findIndex((b) => b.id === afterBlockId);
          if (afterIndex !== -1) {
            state.currentSermon.blocks.splice(afterIndex + 1, 0, newBlock);
            // Reorder
            state.currentSermon.blocks.forEach((b, i) => (b.order = i));
          }
        } else {
          state.currentSermon.blocks.push(newBlock);
        }
      });
    },

    updateBlock: (blockId: string, updates: Partial<SermonBlock>) => {
      set((state) => {
        if (!state.currentSermon) return;
        const block = state.currentSermon.blocks.find((b) => b.id === blockId);
        if (block) {
          Object.assign(block, updates);
        }
      });
    },

    deleteBlock: (blockId: string) => {
      set((state) => {
        if (!state.currentSermon) return;
        state.currentSermon.blocks = state.currentSermon.blocks.filter((b) => b.id !== blockId);
        state.currentSermon.blocks.forEach((b, i) => (b.order = i));
      });
    },

    reorderBlocks: (blockId: string, newOrder: number) => {
      set((state) => {
        if (!state.currentSermon) return;
        const blockIndex = state.currentSermon.blocks.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return;

        const [block] = state.currentSermon.blocks.splice(blockIndex, 1);
        state.currentSermon.blocks.splice(newOrder, 0, block);
        state.currentSermon.blocks.forEach((b, i) => (b.order = i));
      });
    },

    setCurrentSermon: (sermon: Sermon | null) => {
      set({ currentSermon: sermon });
    },

    saveCurrentSermon: async () => {
      const { currentSermon } = get();
      if (!currentSermon) return;

      await get().updateSermon(currentSermon.id, {
        title: currentSermon.title,
        subtitle: currentSermon.subtitle,
        blocks: currentSermon.blocks,
        pages: currentSermon.pages,
      });
    },
  }))
);
