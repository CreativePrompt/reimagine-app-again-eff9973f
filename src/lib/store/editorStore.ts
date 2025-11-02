import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Sermon, SermonBlock, BlockKind } from "../blockTypes";
import { nanoid } from "nanoid";

interface EditorState {
  currentSermon: Sermon | null;
  previewMode: boolean;
  isLoading: boolean;
  
  // Actions
  initialize: (userId?: string) => void;
  setCurrentSermon: (sermon: Sermon | null) => void;
  setTitle: (title: string) => void;
  setSeries: (series: string) => void;
  togglePreview: () => void;
  
  // Block operations
  addBlock: (kind: BlockKind, afterBlockId?: string) => void;
  updateBlock: (blockId: string, updates: Partial<SermonBlock>) => void;
  deleteBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    currentSermon: null,
    previewMode: false,
    isLoading: false,

    initialize: (userId?: string) => {
      // Initialize editor - in production this would load from Supabase
      set((state) => {
        state.isLoading = false;
      });
    },

    setCurrentSermon: (sermon) => {
      set((state) => {
        state.currentSermon = sermon;
      });
    },

    setTitle: (title) => {
      set((state) => {
        if (state.currentSermon) {
          state.currentSermon.title = title;
        }
      });
    },

    setSeries: (series) => {
      set((state) => {
        if (state.currentSermon) {
          state.currentSermon.subtitle = series;
        }
      });
    },

    togglePreview: () => {
      set((state) => {
        state.previewMode = !state.previewMode;
      });
    },

    addBlock: (kind, afterBlockId) => {
      set((state) => {
        if (!state.currentSermon) return;

        const newBlock = createBlock(kind);
        
        if (afterBlockId) {
          const afterIndex = state.currentSermon.blocks.findIndex(
            (b) => b.id === afterBlockId
          );
          if (afterIndex !== -1) {
            state.currentSermon.blocks.splice(afterIndex + 1, 0, newBlock);
          } else {
            state.currentSermon.blocks.push(newBlock);
          }
        } else {
          state.currentSermon.blocks.push(newBlock);
        }

        // Reorder
        state.currentSermon.blocks.forEach((block, index) => {
          block.order = index;
        });
      });
    },

    updateBlock: (blockId, updates) => {
      set((state) => {
        if (!state.currentSermon) return;

        const block = state.currentSermon.blocks.find((b) => b.id === blockId);
        if (block) {
          Object.assign(block, updates);
        }
      });
    },

    deleteBlock: (blockId) => {
      set((state) => {
        if (!state.currentSermon) return;

        state.currentSermon.blocks = state.currentSermon.blocks.filter(
          (b) => b.id !== blockId
        );

        // Reorder
        state.currentSermon.blocks.forEach((block, index) => {
          block.order = index;
        });
      });
    },

    duplicateBlock: (blockId) => {
      set((state) => {
        if (!state.currentSermon) return;

        const blockIndex = state.currentSermon.blocks.findIndex(
          (b) => b.id === blockId
        );
        if (blockIndex === -1) return;

        const originalBlock = state.currentSermon.blocks[blockIndex];
        const duplicatedBlock = {
          ...originalBlock,
          id: nanoid(),
          order: originalBlock.order + 1,
        };

        state.currentSermon.blocks.splice(blockIndex + 1, 0, duplicatedBlock);

        // Reorder
        state.currentSermon.blocks.forEach((block, index) => {
          block.order = index;
        });
      });
    },

    reorderBlocks: (activeId, overId) => {
      set((state) => {
        if (!state.currentSermon) return;

        const oldIndex = state.currentSermon.blocks.findIndex(
          (b) => b.id === activeId
        );
        const newIndex = state.currentSermon.blocks.findIndex(
          (b) => b.id === overId
        );

        if (oldIndex === -1 || newIndex === -1) return;

        const [movedBlock] = state.currentSermon.blocks.splice(oldIndex, 1);
        state.currentSermon.blocks.splice(newIndex, 0, movedBlock);

        // Update order
        state.currentSermon.blocks.forEach((block, index) => {
          block.order = index;
        });
      });
    },
  }))
);

// Helper function to create a new block
function createBlock(kind: BlockKind): SermonBlock {
  const baseBlock = {
    id: nanoid(),
    kind,
    order: 0,
  };

  switch (kind) {
    case "bible":
      return {
        ...baseBlock,
        kind: "bible",
        reference: "",
        text: "",
        translation: "ESV",
        notes: "",
      };
    case "point":
      return {
        ...baseBlock,
        kind: "point",
        title: "",
        body: "",
        number: null,
      };
    case "illustration":
      return {
        ...baseBlock,
        kind: "illustration",
        title: "",
        body: "",
      };
    case "application":
      return {
        ...baseBlock,
        kind: "application",
        title: "",
        body: "",
      };
    case "quote":
      return {
        ...baseBlock,
        kind: "quote",
        text: "",
        author: "",
        source: "",
      };
    case "media":
      return {
        ...baseBlock,
        kind: "media",
        url: "",
        type: "image",
        caption: "",
      };
    case "custom":
      return {
        ...baseBlock,
        kind: "custom",
        title: "",
        body: "",
      };
    case "reader_note":
      return {
        ...baseBlock,
        kind: "reader_note",
        title: "",
        summary: "",
        author: "",
        source: "",
      };
    default:
      throw new Error(`Unknown block kind: ${kind}`);
  }
}
