import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Sermon, SermonBlock, SermonPage, BlockKind } from "../blockTypes";
import { nanoid } from "nanoid";

interface EditorState {
  currentSermon: Sermon | null;
  previewMode: boolean;
  isLoading: boolean;
  viewByPages: boolean;
  
  // Actions
  initialize: (userId?: string) => void;
  setCurrentSermon: (sermon: Sermon | null) => void;
  setTitle: (title: string) => void;
  setSeries: (series: string) => void;
  togglePreview: () => void;
  setViewByPages: (viewByPages: boolean) => void;
  
  // Block operations
  addBlock: (kind: BlockKind, afterBlockId?: string, pageId?: string) => void;
  updateBlock: (blockId: string, updates: Partial<SermonBlock>) => void;
  deleteBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  
  // Page operations
  addPage: (title?: string) => void;
  updatePage: (pageId: string, updates: Partial<SermonPage>) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (activeId: string, overId: string) => void;
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    currentSermon: null,
    previewMode: false,
    isLoading: false,
    viewByPages: false,

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

    setViewByPages: (viewByPages) => {
      set((state) => {
        state.viewByPages = viewByPages;
      });
    },

    addBlock: (kind, afterBlockId, pageId) => {
      set((state) => {
        if (!state.currentSermon) return;

        const newBlock = createBlock(kind, pageId);
        
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

    addPage: (title = "New Page") => {
      set((state) => {
        if (!state.currentSermon) return;
        
        if (!state.currentSermon.pages) {
          state.currentSermon.pages = [];
        }

        const newPage: SermonPage = {
          id: nanoid(),
          title,
          order: state.currentSermon.pages.length,
          isExpanded: true,
        };

        state.currentSermon.pages.push(newPage);
      });
    },

    updatePage: (pageId, updates) => {
      set((state) => {
        if (!state.currentSermon || !state.currentSermon.pages) return;

        const page = state.currentSermon.pages.find((p) => p.id === pageId);
        if (page) {
          Object.assign(page, updates);
        }
      });
    },

    deletePage: (pageId) => {
      set((state) => {
        if (!state.currentSermon || !state.currentSermon.pages) return;

        // Remove the page
        state.currentSermon.pages = state.currentSermon.pages.filter(
          (p) => p.id !== pageId
        );

        // Unassign blocks from this page
        state.currentSermon.blocks.forEach((block) => {
          if (block.pageId === pageId) {
            delete block.pageId;
          }
        });

        // Reorder pages
        state.currentSermon.pages.forEach((page, index) => {
          page.order = index;
        });
      });
    },

    reorderPages: (activeId, overId) => {
      set((state) => {
        if (!state.currentSermon || !state.currentSermon.pages) return;

        const oldIndex = state.currentSermon.pages.findIndex(
          (p) => p.id === activeId
        );
        const newIndex = state.currentSermon.pages.findIndex(
          (p) => p.id === overId
        );

        if (oldIndex === -1 || newIndex === -1) return;

        const [movedPage] = state.currentSermon.pages.splice(oldIndex, 1);
        state.currentSermon.pages.splice(newIndex, 0, movedPage);

        // Update order
        state.currentSermon.pages.forEach((page, index) => {
          page.order = index;
        });
      });
    },
  }))
);

// Helper function to create a new block
function createBlock(kind: BlockKind, pageId?: string): SermonBlock {
  const baseBlock = {
    id: nanoid(),
    kind,
    order: 0,
    ...(pageId && { pageId }),
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
