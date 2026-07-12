import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor, RichTextEditorRef } from "@/components/notes/RichTextEditor";
import { useNotesStore } from "@/lib/store/notesStore";
import { ArrowLeft, Trash2, Plus, X, Save, PanelLeftClose, PanelLeft, BookOpen, Edit, ZoomIn, ZoomOut, Highlighter, Settings, Focus, Search, Clock, BookMarked, Loader2, Bookmark } from "lucide-react";
import { convertNoteHtmlToEsv } from "@/lib/convertToEsv";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { HighlightSettingsDialog, HighlightSettings, PRESET_COLORS } from "@/components/notes/HighlightSettingsDialog";
import { SpotlightPopup } from "@/components/notes/SpotlightPopup";
import { SpotlightSettingsDialog, SpotlightSettings, DEFAULT_SPOTLIGHT_SETTINGS } from "@/components/notes/SpotlightSettingsDialog";
import { ScriptureSearchSidebar } from "@/components/notes/ScriptureSearchSidebar";
import { PresenterModeBar } from "@/components/notes/PresenterModeBar";
import { PresenterSidePanel } from "@/components/notes/PresenterSidePanel";
import { BookmarksPanel, AddBookmarkDialog, pickDefaultBookmarkColor } from "@/components/notes/BookmarksPanel";
import type { NoteBookmark } from "@/lib/store/notesStore";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { computeTextOffset, findElementByTextOffset, findTextInElement } from "@/lib/bookmarkOffsets";
import { fetchNextVerse, cleanVerseText } from "@/lib/scriptureNavigation";
import "@/components/notes/RichTextEditor.css";

type ViewMode = 'edit' | 'reader';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

const LOCAL_STORAGE_KEY = 'note-highlight-settings';
const SPOTLIGHT_STORAGE_KEY = 'note-spotlight-settings';

export default function NoteEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { notes, currentNote, loadNotes, updateNote, deleteNote, setCurrentNote } = useNotesStore();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scriptureSearchOpen, setScriptureSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [zoom, setZoom] = useState(100);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState<Set<string>>(new Set());
  const [highlightSettingsOpen, setHighlightSettingsOpen] = useState(false);
  const [spotlightSettingsOpen, setSpotlightSettingsOpen] = useState(false);
  const [highlightSettings, setHighlightSettings] = useState<HighlightSettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { 
          color: 'green', 
          brightness: 50, 
          singleSelectMode: true, 
          clearOnClickOutside: true,
          spotlightMode: false,
          spotlightDimBackground: true,
          spotlightAutoClose: true,
        };
      }
    }
    return { 
      color: 'green', 
      brightness: 50, 
      singleSelectMode: true, 
      clearOnClickOutside: true,
      spotlightMode: false,
      spotlightDimBackground: true,
      spotlightAutoClose: true,
    };
  });
  const [spotlightSettings, setSpotlightSettings] = useState<SpotlightSettings>(() => {
    const saved = localStorage.getItem(SPOTLIGHT_STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SPOTLIGHT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SPOTLIGHT_SETTINGS;
      }
    }
    return DEFAULT_SPOTLIGHT_SETTINGS;
  });
  const [spotlightText, setSpotlightText] = useState("");
  const [spotlightImage, setSpotlightImage] = useState<string | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightPage, setSpotlightPage] = useState(0);
  const [spotlightTotalPages, setSpotlightTotalPages] = useState(1);
  const [emphasisList, setEmphasisList] = useState<Array<{
    start: number;
    end: number;
    text: string;
    colorId: string;
  }>>([]);
  const readerContentRef = useRef<HTMLElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [nextVerseLoading, setNextVerseLoading] = useState(false);
  
  // Presenter side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [suppressPopup, setSuppressPopup] = useState(false);
  const [presenterLiveState, setPresenterLiveState] = useState({
    isLive: false,
    audienceCount: 0,
    audienceUrl: '',
  });

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<NoteBookmark[]>([]);
  const [bookmarksCollapsed, setBookmarksCollapsed] = useState(false);
  const [addBookmarkOpen, setAddBookmarkOpen] = useState(false);
  const [pendingBookmarkLabel, setPendingBookmarkLabel] = useState("");
  const [hasSelection, setHasSelection] = useState(false);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [readProgress, setReadProgress] = useState(0);

  // Handle live state changes from PresenterModeBar
  const handleLiveStateChange = useCallback((isLive: boolean, audienceCount: number, audienceUrl: string) => {
    setPresenterLiveState({ isLive, audienceCount, audienceUrl });
  }, []);

  // Shared "Next Verse" handler — works across Edit, Reader, and Live modes.
  // In edit mode it delegates to the RichTextEditor's Quill instance for perfect formatting.
  // In other modes it appends the next verse to the note's HTML content directly.
  const handleInsertNextVerse = useCallback(async () => {
    if (nextVerseLoading) return;
    // Edit mode: use the editor directly (also updates content via onChange)
    if (viewMode === 'edit' && editorRef.current) {
      setNextVerseLoading(true);
      try {
        await editorRef.current.insertNextVerse();
      } finally {
        setNextVerseLoading(false);
      }
      return;
    }

    // Reader mode (or any non-edit mode): parse the live HTML and append.
    setNextVerseLoading(true);
    try {
      // Derive plain text for reference detection
      const tmp = document.createElement("div");
      tmp.innerHTML = content;
      const plain = tmp.innerText || tmp.textContent || "";

      const result = await fetchNextVerse(plain);
      if (!result) {
        toast({
          title: "End of passage",
          description: "No further verse is available after the last reference.",
          variant: "destructive",
        });
        return;
      }

      const cleaned = cleanVerseText(result.text);
      const appended =
        `<p><em>"${cleaned.replace(/"/g, "&quot;")}"</em></p>` +
        `<p><em>— ${result.reference}, ESV</em></p>`;

      const newContent = (content || "") + appended;
      setContent(newContent);
      setHasUnsavedChanges(true);

      // Scroll reader to the newly appended content shortly after render
      requestAnimationFrame(() => {
        const root = readerContentRef.current;
        if (!root) return;
        const paras = root.querySelectorAll("p");
        const last = paras[paras.length - 1];
        last?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      toast({
        title: "Next verse inserted",
        description: `${result.reference} (ESV) added to your notes.`,
      });
    } catch (err: any) {
      console.error("Next verse error:", err);
      if (err?.message === "NO_REFERENCE") {
        toast({
          title: "No Scripture reference found",
          description: "Select or insert a Scripture reference before using Next Verse.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Unable to retrieve the next verse",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } finally {
      setNextVerseLoading(false);
    }
  }, [content, nextVerseLoading, toast, viewMode]);


  // Handle copy audience URL
  const handleCopyAudienceUrl = useCallback(() => {
    navigator.clipboard.writeText(presenterLiveState.audienceUrl);
    toast({
      title: "Link Copied",
      description: "Audience link copied to clipboard.",
    });
  }, [presenterLiveState.audienceUrl, toast]);

  // Handle open audience view
  const handleOpenAudienceView = useCallback(() => {
    window.open(presenterLiveState.audienceUrl, '_blank');
  }, [presenterLiveState.audienceUrl]);

  // Handle page change from side panel
  const handleSidePanelPageChange = useCallback((page: number) => {
    setSpotlightPage(page);
  }, []);

  // Handle inserting scripture from sidebar into editor at cursor position
  const handleInsertAtCursor = useCallback((text: string) => {
    if (editorRef.current) {
      editorRef.current.insertAtCursor(text);
      setHasUnsavedChanges(true);
    }
  }, []);

  // Handle inserting scripture from sidebar into editor (fallback: append)
  const handleInsertScripture = useCallback((reference: string, text: string) => {
    const formattedText = `\n\n${reference} — "${text}" (ESV)\n\n`;
    // Append to content
    setContent(prev => prev + formattedText);
    setHasUnsavedChanges(true);
  }, []);

  // Convert all scripture references in the note to ESV
  const [convertingEsv, setConvertingEsv] = useState(false);
  const handleConvertToEsv = useCallback(async () => {
    // Get the latest content from the editor
    const currentContent = editorRef.current?.getContent() ?? content;
    if (!currentContent || !currentContent.trim()) {
      toast({ title: "Nothing to convert", description: "This note is empty." });
      return;
    }
    setConvertingEsv(true);
    try {
      const result = await convertNoteHtmlToEsv(currentContent);
      if (result.replaced === 0) {
        toast({
          title: "No scriptures replaced",
          description: result.failed.length
            ? `Could not fetch: ${result.failed.slice(0, 3).join(", ")}`
            : "No scripture references with quoted text were found.",
        });
      } else {
        setContent(result.html);
        setHasUnsavedChanges(true);
        toast({
          title: "Converted to ESV",
          description: `${result.replaced} scripture${result.replaced === 1 ? "" : "s"} replaced.${result.failed.length ? ` Failed: ${result.failed.length}` : ""}`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Conversion failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setConvertingEsv(false);
    }
  }, [content, toast]);

  // Clear all highlights helper function
  const clearAllHighlights = useCallback(() => {
    readerContentRef.current?.querySelectorAll('.reader-highlight-active').forEach(el => {
      el.classList.remove('reader-highlight-active');
    });
    setHighlightedElements(new Set());
  }, []);

  // Handle click outside reader content to clear highlights
  const handleOutsideClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!highlightMode || highlightSettings.singleSelectMode || !highlightSettings.clearOnClickOutside) return;
    
    // Check if click is outside the reader content (article element)
    if (readerContentRef.current && !readerContentRef.current.contains(e.target as Node)) {
      clearAllHighlights();
    }
  }, [highlightMode, highlightSettings.singleSelectMode, highlightSettings.clearOnClickOutside, clearAllHighlights]);

  // Handle click on reader content to toggle highlight
  const handleReaderContentClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!highlightMode) return;
    
    const target = e.target as HTMLElement;
    
    // Find the closest highlightable element (p, h1, h2, h3, h4, li, blockquote)
    const highlightable = target.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    if (!highlightable || !readerContentRef.current?.contains(highlightable)) return;
    
    // Generate a unique identifier based on content and position
    const siblings = Array.from(highlightable.parentElement?.children || []);
    const index = siblings.indexOf(highlightable as Element);
    const tagName = highlightable.tagName.toLowerCase();
    const elementId = `${tagName}-${index}-${highlightable.textContent?.slice(0, 20)}`;
    
    // If single select mode is on, clear previous highlights first
    if (highlightSettings.singleSelectMode && !highlightedElements.has(elementId)) {
      readerContentRef.current?.querySelectorAll('.reader-highlight-active').forEach(el => {
        el.classList.remove('reader-highlight-active');
      });
      setHighlightedElements(new Set());
    }

    setHighlightedElements(prev => {
      const newSet = highlightSettings.singleSelectMode ? new Set<string>() : new Set(prev);
      if (prev.has(elementId)) {
        highlightable.classList.remove('reader-highlight-active');
        // For single select, set stays empty; for multi, we remove this one
        if (!highlightSettings.singleSelectMode) {
          newSet.delete(elementId);
        }
      } else {
        newSet.add(elementId);
        highlightable.classList.add('reader-highlight-active');
      }
      return newSet;
    });
  }, [highlightMode, highlightSettings.singleSelectMode, highlightedElements]);

  // Handle text selection for Spotlight mode
  const handleTextSelection = useCallback(() => {
    if (!highlightMode || !spotlightSettings.enabled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Make sure selection is within the reader content
    const range = selection.getRangeAt(0);
    if (!readerContentRef.current?.contains(range.commonAncestorContainer)) return;

    // Clear selection after capturing text
    selection.removeAllRanges();

    // If auto-close is enabled, just replace the content
    if (spotlightSettings.autoClose) {
      setSpotlightImage(null);
      setSpotlightText(selectedText);
      setSpotlightOpen(true);
    } else {
      // Stack behavior: only open if not already open, otherwise replace
      setSpotlightImage(null);
      setSpotlightText(selectedText);
      setSpotlightOpen(true);
    }
  }, [highlightMode, spotlightSettings.enabled, spotlightSettings.autoClose]);

  // Close spotlight popup
  const handleSpotlightClose = useCallback(() => {
    setSpotlightOpen(false);
    setSpotlightText("");
    setSpotlightImage(null);
    setEmphasisList([]);
    setSpotlightPage(0);
    setSpotlightTotalPages(1);
  }, []);

  // Click on image in reader -> broadcast image to audience
  const handleReaderImageClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    const src = (target as HTMLImageElement).src;
    if (!src) return;
    e.stopPropagation();
    // If clicking the same image again, close it
    if (spotlightImage === src && spotlightOpen) {
      handleSpotlightClose();
      return;
    }
    setSpotlightText("");
    setEmphasisList([]);
    setSpotlightImage(src);
    setSpotlightOpen(true);
  }, [spotlightImage, spotlightOpen, handleSpotlightClose]);

  // Save highlight settings and apply CSS variables
  const handleSaveHighlightSettings = useCallback((newSettings: HighlightSettings) => {
    setHighlightSettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    toast({
      title: "Settings saved",
      description: "Your highlight settings have been saved.",
    });
  }, [toast]);

  // Save spotlight settings
  const handleSaveSpotlightSettings = useCallback((newSettings: SpotlightSettings) => {
    setSpotlightSettings(newSettings);
    localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(newSettings));
    toast({
      title: "Spotlight settings saved",
      description: "Your spotlight settings have been saved.",
    });
  }, [toast]);

  // Generate highlight color CSS variables
  const getHighlightColorStyles = useCallback(() => {
    const color = PRESET_COLORS.find(c => c.value === highlightSettings.color) || PRESET_COLORS[0];
    const parts = color.hsl.split(" ");
    const h = parts[0];
    const s = parts[1];
    const baseLightness = parseInt(parts[2]);
    
    // Adjust lightness based on brightness
    const adjustment = (highlightSettings.brightness - 50) * 0.4;
    const newLightness = Math.max(20, Math.min(80, baseLightness + adjustment));
    const bgLightness = Math.min(95, newLightness + 35);
    
    return {
      '--highlight-color': `${h} ${s} ${newLightness}%`,
      '--highlight-bg': `${h} ${s} ${bgLightness}%`,
    } as React.CSSProperties;
  }, [highlightSettings.color, highlightSettings.brightness]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !authLoading) {
      loadNotes();
    }
  }, [user, authLoading, loadNotes]);

  useEffect(() => {
    if (id && notes.length > 0) {
      const note = notes.find(n => n.id === id);
      if (note) {
        setCurrentNote(note);
        setTitle(note.title);
        setContent(note.content);
        setTags(note.tags || []);
        setBookmarks(note.bookmarks || []);
        setHasUnsavedChanges(false);
      }
    }
  }, [id, notes, setCurrentNote]);

  // Track text selection (in editor or reader) to enable "Add bookmark" button
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      setHasSelection(!!sel && !sel.isCollapsed && sel.toString().trim().length > 0);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  // Bookmark handlers
  const updateBookmarks = useCallback((next: NoteBookmark[]) => {
    setBookmarks(next);
    setHasUnsavedChanges(true);
  }, []);

  const handleRequestAddBookmark = useCallback(() => {
    let selectedText = "";
    if (viewMode === 'edit' && editorRef.current) {
      selectedText = editorRef.current.getSelectedText();
    }
    if (!selectedText) {
      const sel = window.getSelection();
      selectedText = sel ? sel.toString().trim() : "";
    }
    if (!selectedText) {
      toast({
        title: "Select text first",
        description: "Highlight text in the document to bookmark that location.",
      });
      return;
    }
    setPendingBookmarkLabel(selectedText.slice(0, 60));
    setAddBookmarkOpen(true);
  }, [viewMode, toast]);

  const handleConfirmAddBookmark = useCallback(
    (label: string, abbreviation: string, color: string, subtitle: string, level: number) => {
      const newId = `bm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let offset = 0;
      let snippet = "";

      if (viewMode === 'edit' && editorRef.current) {
        offset = editorRef.current.getSelectionOffset();
        snippet = editorRef.current.getSnippetAtOffset(offset, 60);
      } else if (viewMode === 'reader' && readerContentRef.current) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (readerContentRef.current.contains(range.commonAncestorContainer)) {
            offset = computeTextOffset(readerContentRef.current, range.startContainer, range.startOffset);
            const allText = readerContentRef.current.innerText || "";
            const start = Math.max(0, offset - 30);
            const end = Math.min(allText.length, offset + 30);
            snippet = allText.slice(start, end).replace(/\s+/g, " ").trim();
          }
        }
      }

      const newBookmark: NoteBookmark = {
        id: newId,
        label,
        abbreviation,
        subtitle,
        level,
        color,
        order: bookmarks.length,
        offset,
        snippet,
      };

      const next = [...bookmarks, newBookmark];
      setBookmarks(next);
      setHasUnsavedChanges(true);
      setAddBookmarkOpen(false);
      toast({ title: "Bookmark added", description: label });
    },
    [bookmarks, viewMode, toast]
  );

  const handleJumpToBookmark = useCallback((bookmarkId: string) => {
    const bm = bookmarks.find((b) => b.id === bookmarkId);
    if (!bm) return;

    const flashAt = (el: HTMLElement) => {
      const block = (el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div') as HTMLElement) || el;
      block.classList.remove('bookmark-flash');
      void block.offsetWidth;
      block.classList.add('bookmark-flash');
      setTimeout(() => block.classList.remove('bookmark-flash'), 1700);
    };

    if (viewMode === 'edit' && editorRef.current) {
      // Try offset first
      if (typeof bm.offset === 'number') {
        const ok = editorRef.current.scrollToOffset(bm.offset);
        if (ok) {
          const editorEl = document.querySelector('.custom-quill-editor .ql-editor') as HTMLElement | null;
          if (editorEl) {
            // Flash the block containing the focused leaf
            const sel = window.getSelection();
            const node = sel?.focusNode as Node | null;
            const target = (node && node.nodeType === 1 ? (node as HTMLElement) : node?.parentElement) || editorEl;
            flashAt(target);
          }
          return;
        }
      }
      // Fallback: find by snippet
      if (bm.snippet) {
        const editorEl = document.querySelector('.custom-quill-editor .ql-editor') as HTMLElement | null;
        const found = editorEl ? findTextInElement(editorEl, bm.snippet) : null;
        if (found) {
          found.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashAt(found);
          return;
        }
      }
      toast({ title: "Bookmark location missing", description: "Text near this bookmark wasn't found.", variant: "destructive" });
    } else {
      // Reader mode
      if (!readerContentRef.current) return;
      const root = readerContentRef.current;
      let target: HTMLElement | null = null;
      if (typeof bm.offset === 'number') {
        target = findElementByTextOffset(root, bm.offset);
      }
      if (!target && bm.snippet) {
        target = findTextInElement(root, bm.snippet);
      }
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashAt(target);
      } else {
        toast({ title: "Bookmark location missing", description: "Text near this bookmark wasn't found.", variant: "destructive" });
      }
    }
  }, [bookmarks, viewMode, toast]);

  // Active-section tracking: sync bookmark highlight with scroll position
  useEffect(() => {
    if (bookmarks.length === 0) {
      setActiveBookmarkId(null);
      setReadProgress(0);
      return;
    }

    // Resolve scroll container + content root for the current view
    const getRefs = (): { scroller: HTMLElement | null; root: HTMLElement | null } => {
      if (viewMode === 'reader') {
        return { scroller: readerContainerRef.current, root: readerContentRef.current };
      }
      const editorEl = document.querySelector('.custom-quill-editor .ql-editor') as HTMLElement | null;
      return { scroller: editorEl, root: editorEl };
    };

    let raf = 0;
    const compute = () => {
      raf = 0;
      const { scroller, root } = getRefs();
      if (!scroller || !root) return;

      // progress
      const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const pct = Math.min(100, Math.max(0, (scroller.scrollTop / max) * 100));
      setReadProgress(pct);

      // Determine active bookmark: last one whose target top is above the trigger line
      const rootRect = root.getBoundingClientRect();
      const triggerY = 140;
      let bestId: string | null = null;
      let bestTop = -Infinity;
      for (const bm of bookmarks) {
        let el: HTMLElement | null = null;
        if (typeof bm.offset === 'number') el = findElementByTextOffset(root, bm.offset);
        if (!el && bm.snippet) el = findTextInElement(root, bm.snippet);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - rootRect.top - scroller.scrollTop;
        // Position relative to viewport of scroller:
        const viewportTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        if (viewportTop <= triggerY && viewportTop > bestTop) {
          bestTop = viewportTop;
          bestId = bm.id;
        }
      }
      if (!bestId) bestId = [...bookmarks].sort((a, b) => a.order - b.order)[0]?.id ?? null;
      setActiveBookmarkId(bestId);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    const { scroller } = getRefs();
    if (!scroller) return;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    // Initial compute (delayed so DOM is ready)
    const t = setTimeout(compute, 100);

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [bookmarks, viewMode, content]);



  // Auto-save effect
  useEffect(() => {
    if (!id || !hasUnsavedChanges) return;

    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set up new auto-save timer
    autoSaveTimerRef.current = setTimeout(async () => {
      // Get latest content from editor if available
      let currentContent = content;
      if (editorRef.current) {
        currentContent = editorRef.current.getContent();
      }

      await updateNote(id, { title, content: currentContent, tags, bookmarks });
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      toast({
        title: "Auto-saved",
        description: "Your changes have been automatically saved.",
        duration: 2000,
      });
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [id, hasUnsavedChanges, title, content, tags, bookmarks, updateNote, toast]);

  // Handle visibility change - save on tab blur
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && id && hasUnsavedChanges) {
        // Get latest content from editor
        let currentContent = content;
        if (editorRef.current) {
          currentContent = editorRef.current.getContent();
        }

        await updateNote(id, { title, content: currentContent, tags, bookmarks });
        setHasUnsavedChanges(false);
        setLastAutoSave(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, hasUnsavedChanges, title, content, tags, bookmarks, updateNote]);

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!id) return;
    
    // Get latest content from editor
    let currentContent = content;
    if (editorRef.current) {
      currentContent = editorRef.current.getContent();
    }
    
    await updateNote(id, { title, content: currentContent, tags, bookmarks });
    setHasUnsavedChanges(false);
    setLastAutoSave(new Date());
    toast({
      title: "Note saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (confirm("Are you sure you want to delete this note?")) {
      await deleteNote(id);
      navigate("/notes");
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully.",
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag("");
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    setHasUnsavedChanges(true);
  };

  const handleChange = (field: 'title' | 'content', value: string) => {
    if (field === 'title') setTitle(value);
    else setContent(value);
    setHasUnsavedChanges(true);
  };

  if (authLoading || !user) {
    return null;
  }

  const tagColors: { [key: string]: string } = {
    work: "bg-[hsl(var(--soft-blue))] text-white hover:bg-[hsl(var(--soft-blue))]/90",
    projects: "bg-[hsl(var(--orange-warm))] text-white hover:bg-[hsl(var(--orange-warm))]/90",
    personal: "bg-[hsl(var(--purple-soft))] text-white hover:bg-[hsl(var(--purple-soft))]/90",
    travel: "bg-[hsl(var(--soft-blue-light))] text-[hsl(var(--soft-blue))] hover:bg-[hsl(var(--soft-blue-light))]/80",
    learning: "bg-[hsl(var(--purple-light))] text-[hsl(var(--purple-soft))] hover:bg-[hsl(var(--purple-light))]/80",
    ideas: "bg-[hsl(var(--green-light))] text-[hsl(var(--green-fresh))] hover:bg-[hsl(var(--green-light))]/80"
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Notes List */}
      <AnimatePresence mode="wait">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r bg-card overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="flex-1 justify-start" 
                onClick={() => navigate("/notes")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Notes
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="ml-2"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-muted-foreground px-3 mb-2">MY NOTES</h3>
              <div className="space-y-1">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      note.id === id 
                        ? "bg-[hsl(var(--soft-blue-light))] border-l-4 border-[hsl(var(--soft-blue))]" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium text-sm line-clamp-1">{note.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 60) : "No content"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Panel - visible in edit + reader modes */}
      <BookmarksPanel
        bookmarks={bookmarks}
        collapsed={bookmarksCollapsed}
        onToggleCollapsed={() => setBookmarksCollapsed(!bookmarksCollapsed)}
        onJump={handleJumpToBookmark}
        onUpdate={updateBookmarks}
        onRequestAdd={handleRequestAddBookmark}
        canAdd={hasSelection}
        activeId={activeBookmarkId}
        progress={readProgress}
      />


      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Header */}
        <div className="border-b bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            {currentNote && (
              <span className="text-sm text-muted-foreground">
                Last updated {formatDistanceToNow(new Date(currentNote.updated_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Bookmark current selection */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestAddBookmark}
              disabled={!hasSelection}
              title={hasSelection ? "Bookmark selected text" : "Select text to bookmark"}
            >
              <Bookmark className="h-4 w-4 mr-1" />
              Bookmark
            </Button>

            {/* Scripture Search Button - Only in Edit mode */}
            {viewMode === 'edit' && (
              <>
                <Button
                  variant={scriptureSearchOpen ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScriptureSearchOpen(!scriptureSearchOpen)}
                  className={scriptureSearchOpen ? 'bg-primary' : ''}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Search Bible
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConvertToEsv}
                  disabled={convertingEsv}
                  title="Replace all scripture quotes in this note with the ESV translation"
                >
                  {convertingEsv ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <BookMarked className="h-4 w-4 mr-1" />
                  )}
                  {convertingEsv ? "Converting..." : "Convert to ESV"}
                </Button>
              </>
            )}

            {viewMode === 'edit' && <div className="h-4 w-px bg-border" />}

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('edit')}
                className="rounded-none"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant={viewMode === 'reader' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('reader')}
                className="rounded-none"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Reader
              </Button>
            </div>

            {/* Reader Mode Controls - shown in reader mode */}
            {viewMode === 'reader' && (
              <>
                <div className="h-4 w-px bg-border" />
                
                {/* Highlight Mode Toggle */}
                <Button
                  variant={highlightMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setHighlightMode(!highlightMode);
                    // Clear highlights when turning off
                    if (highlightMode) {
                      setHighlightedElements(new Set());
                      readerContentRef.current?.querySelectorAll('.reader-highlight-active').forEach(el => {
                        el.classList.remove('reader-highlight-active');
                      });
                    }
                  }}
                  className={highlightMode ? 'bg-[hsl(var(--green-fresh))] hover:bg-[hsl(var(--green-fresh))]/90 text-white' : ''}
                >
                  <Highlighter className="h-4 w-4 mr-1" />
                  Highlight
                </Button>
                
                {/* Highlight Settings Button - Only show when highlight mode is on */}
                {highlightMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHighlightSettingsOpen(true)}
                    title="Highlight Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}

                {/* Spotlight Mode Toggle */}
                {highlightMode && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      variant={spotlightSettings.enabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSpotlightSettingsOpen(true)}
                      className={spotlightSettings.enabled ? 'bg-[hsl(var(--orange-warm))] hover:bg-[hsl(var(--orange-warm))]/90 text-white' : ''}
                    >
                      <Focus className="h-4 w-4 mr-1" />
                      Spotlight
                    </Button>
                  </>
                )}
                
                <div className="h-4 w-px bg-border" />
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="h-7 w-7 rounded-md"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs font-medium min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="h-7 w-7 rounded-md"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Presenter Mode - Only in reader + highlight mode */}
                {highlightMode && spotlightSettings.enabled && id && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <PresenterModeBar
                      noteId={id}
                      noteTitle={title}
                      spotlightText={spotlightText}
                      spotlightImage={spotlightImage}
                      spotlightOpen={spotlightOpen}
                      spotlightSettings={spotlightSettings}
                      currentPage={spotlightPage}
                      totalPages={spotlightTotalPages}
                      emphasisList={emphasisList}
                      sidePanelOpen={sidePanelOpen}
                      onSidePanelToggle={() => setSidePanelOpen(!sidePanelOpen)}
                      onLiveStateChange={handleLiveStateChange}
                      suppressPopup={suppressPopup}
                      onSuppressPopupToggle={() => setSuppressPopup(!suppressPopup)}
                    />
                  </>
                )}
              </>
            )}
            
            {hasUnsavedChanges ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Unsaved changes
              </span>
            ) : lastAutoSave ? (
              <span className="text-sm text-primary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Saved at {format(lastAutoSave, 'h:mm a')}
              </span>
            ) : null}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="bg-[hsl(var(--soft-blue))] hover:bg-[hsl(var(--soft-blue))]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'edit' ? (
            <div className="p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                {/* Title */}
                <Input
                  value={title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Note title..."
                  className="text-4xl font-bold border-none focus-visible:ring-0 px-0 mb-4"
                />

                {/* Tags */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        className={`${tagColors[tag.toLowerCase()] || "bg-muted"} cursor-pointer`}
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="max-w-xs"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleAddTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content - Rich Text Editor */}
                <RichTextEditor
                  ref={editorRef}
                  value={content}
                  onChange={(value) => handleChange('content', value)}
                  placeholder="Start writing your note..."
                />
              </motion.div>
            </div>
          ) : (
            /* Reader View with optional Side Panel */
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Main Reader Panel */}
              <ResizablePanel defaultSize={sidePanelOpen ? 65 : 100} minSize={40}>
                <div 
                  ref={readerContainerRef}
                  className="p-8 bg-muted/30 h-full overflow-auto"
                  onClick={handleOutsideClick}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: 1, scale: zoom / 100 }}
                    transition={{ 
                      duration: 0.3,
                      scale: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                    }}
                    className="max-w-3xl mx-auto bg-card rounded-lg shadow-lg p-12 md:p-16 origin-top"
                  >
                    {/* Reader Header */}
                    <header className="text-center mb-12 pb-8 border-b">
                      <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{title || "Untitled Note"}</h1>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                          {tags.map((tag, index) => (
                            <Badge 
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {currentNote && (
                        <p className="text-sm text-muted-foreground">
                          Updated {formatDistanceToNow(new Date(currentNote.updated_at), { addSuffix: true })}
                        </p>
                      )}
                    </header>

                    {/* Reader Content */}
                    <article 
                      ref={readerContentRef}
                      className={`reader-content reader-content-images-clickable ${highlightMode ? 'highlight-mode-active' : ''}`}
                      style={getHighlightColorStyles()}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName === 'IMG') {
                          handleReaderImageClick(e);
                          return;
                        }
                        handleReaderContentClick(e);
                      }}
                      onMouseUp={handleTextSelection}
                      dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground italic">No content yet...</p>' }}
                    />
                  </motion.div>
                </div>
              </ResizablePanel>

              {/* Presenter Side Panel */}
              {sidePanelOpen && highlightMode && spotlightSettings.enabled && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
                    <PresenterSidePanel
                      spotlightText={spotlightText}
                      spotlightOpen={spotlightOpen}
                      spotlightSettings={spotlightSettings}
                      emphasisList={emphasisList}
                      currentPage={spotlightPage}
                      totalPages={spotlightTotalPages}
                      onPageChange={handleSidePanelPageChange}
                      onEmphasisChange={setEmphasisList}
                      onUpdateSettings={handleSaveSpotlightSettings}
                      audienceCount={presenterLiveState.audienceCount}
                      isLive={presenterLiveState.isLive}
                      audienceUrl={presenterLiveState.audienceUrl}
                      onCopyUrl={handleCopyAudienceUrl}
                      onOpenAudienceView={handleOpenAudienceView}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      {/* Highlight Settings Dialog */}
      <HighlightSettingsDialog
        open={highlightSettingsOpen}
        onOpenChange={setHighlightSettingsOpen}
        settings={highlightSettings}
        onSave={handleSaveHighlightSettings}
      />

      {/* Spotlight Popup - Only render if not suppressed */}
      {!suppressPopup && (
        <SpotlightPopup
          text={spotlightText}
          isOpen={spotlightOpen}
          onClose={handleSpotlightClose}
          settings={spotlightSettings}
          onUpdateSettings={handleSaveSpotlightSettings}
          onEmphasisChange={setEmphasisList}
          onPageChange={(page, total) => {
            setSpotlightPage(page);
            setSpotlightTotalPages(total);
          }}
        />
      )}

      {/* Spotlight Settings Dialog */}
      <SpotlightSettingsDialog
        open={spotlightSettingsOpen}
        onOpenChange={setSpotlightSettingsOpen}
        settings={spotlightSettings}
        onSave={handleSaveSpotlightSettings}
      />

      {/* Scripture Search Sidebar - Right side */}
      <ScriptureSearchSidebar
        isOpen={scriptureSearchOpen}
        onClose={() => setScriptureSearchOpen(false)}
        onInsertScripture={handleInsertScripture}
        insertAtCursor={handleInsertAtCursor}
      />

      {/* Add Bookmark Dialog */}
      <AddBookmarkDialog
        open={addBookmarkOpen}
        defaultLabel={pendingBookmarkLabel}
        defaultColor={pickDefaultBookmarkColor(bookmarks.length)}
        onClose={() => setAddBookmarkOpen(false)}
        onConfirm={handleConfirmAddBookmark}
      />

    </div>
  );
}
