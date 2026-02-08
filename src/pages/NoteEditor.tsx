import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor, RichTextEditorRef } from "@/components/notes/RichTextEditor";
import { useNotesStore } from "@/lib/store/notesStore";
import { ArrowLeft, Trash2, Plus, X, Save, PanelLeftClose, PanelLeft, BookOpen, Edit, ZoomIn, ZoomOut, Highlighter, Settings, Focus, Search, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { HighlightSettingsDialog, HighlightSettings, PRESET_COLORS } from "@/components/notes/HighlightSettingsDialog";
import { SpotlightPopup } from "@/components/notes/SpotlightPopup";
import { SpotlightSettingsDialog, SpotlightSettings, DEFAULT_SPOTLIGHT_SETTINGS } from "@/components/notes/SpotlightSettingsDialog";
import { ScriptureSearchSidebar } from "@/components/notes/ScriptureSearchSidebar";
import { PresenterModeBar } from "@/components/notes/PresenterModeBar";
import { PresenterSidePanel } from "@/components/notes/PresenterSidePanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  
  // Presenter side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [presenterLiveState, setPresenterLiveState] = useState({
    isLive: false,
    audienceCount: 0,
    audienceUrl: '',
  });

  // Handle live state changes from PresenterModeBar
  const handleLiveStateChange = useCallback((isLive: boolean, audienceCount: number, audienceUrl: string) => {
    setPresenterLiveState({ isLive, audienceCount, audienceUrl });
  }, []);

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
      setSpotlightText(selectedText);
      setSpotlightOpen(true);
    } else {
      // Stack behavior: only open if not already open, otherwise replace
      setSpotlightText(selectedText);
      setSpotlightOpen(true);
    }
  }, [highlightMode, spotlightSettings.enabled, spotlightSettings.autoClose]);

  // Close spotlight popup
  const handleSpotlightClose = useCallback(() => {
    setSpotlightOpen(false);
    setSpotlightText("");
    setEmphasisList([]);
    setSpotlightPage(0);
    setSpotlightTotalPages(1);
  }, []);

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
        setHasUnsavedChanges(false);
      }
    }
  }, [id, notes, setCurrentNote]);

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

      await updateNote(id, { title, content: currentContent, tags });
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
  }, [id, hasUnsavedChanges, title, content, tags, updateNote, toast]);

  // Handle visibility change - save on tab blur
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && id && hasUnsavedChanges) {
        // Get latest content from editor
        let currentContent = content;
        if (editorRef.current) {
          currentContent = editorRef.current.getContent();
        }

        await updateNote(id, { title, content: currentContent, tags });
        setHasUnsavedChanges(false);
        setLastAutoSave(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, hasUnsavedChanges, title, content, tags, updateNote]);

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
    
    await updateNote(id, { title, content: currentContent, tags });
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
            {/* Scripture Search Button - Only in Edit mode */}
            {viewMode === 'edit' && (
              <Button
                variant={scriptureSearchOpen ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScriptureSearchOpen(!scriptureSearchOpen)}
                className={scriptureSearchOpen ? 'bg-primary' : ''}
              >
                <Search className="h-4 w-4 mr-1" />
                Search Bible
              </Button>
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
                      spotlightOpen={spotlightOpen}
                      spotlightSettings={spotlightSettings}
                      currentPage={spotlightPage}
                      totalPages={spotlightTotalPages}
                      emphasisList={emphasisList}
                      sidePanelOpen={sidePanelOpen}
                      onSidePanelToggle={() => setSidePanelOpen(!sidePanelOpen)}
                      onLiveStateChange={handleLiveStateChange}
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
                      className={`reader-content ${highlightMode ? 'highlight-mode-active' : ''}`}
                      style={getHighlightColorStyles()}
                      onClick={handleReaderContentClick}
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

      {/* Spotlight Popup */}
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
    </div>
  );
}
