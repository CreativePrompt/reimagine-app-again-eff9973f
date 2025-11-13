import { useState, useRef, useEffect } from "react";
import { NoteEditor } from "./NoteEditor";
import { HighlightToolbar } from "./HighlightToolbar";
import { Lightbulb, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Highlight {
  id: string;
  start_offset: number;
  end_offset: number;
  color: string;
  text: string;
}

interface Note {
  id: string;
  content: string;
  position_offset: number;
}

interface ModernDocumentViewProps {
  text: string;
  highlights: Highlight[];
  notes: Note[];
  onHighlight: (text: string, startOffset: number, endOffset: number, color: string) => Promise<void>;
  onRemoveHighlight: (id: string) => Promise<void>;
  onUpdateHighlight: (id: string, color: string) => Promise<void>;
  onAddNote: (content: string, offset: number) => Promise<void>;
  onUpdateNote: (id: string, content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function ModernDocumentView({
  text,
  highlights,
  notes,
  onHighlight,
  onRemoveHighlight,
  onUpdateHighlight,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: ModernDocumentViewProps) {
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [noteEditorOffset, setNoteEditorOffset] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowToolbar(false);
      setSelectedHighlightId(null);
    };
    
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleTextSelection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") return;

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate offset
    const preSelectionRange = range.cloneRange();
    if (contentRef.current) {
      preSelectionRange.selectNodeContents(contentRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preSelectionRange.toString().length;
      const endOffset = startOffset + selectedText.length;

      // Show toolbar
      setToolbarPosition({
        top: rect.top + window.scrollY - 60,
        left: rect.left + rect.width / 2,
      });
      setShowToolbar(true);
      setSelectedHighlightId(null);

      // Save the selection info for later use
      (window as any).pendingHighlight = { selectedText, startOffset, endOffset };
    }
  };

  const handleHighlight = async () => {
    const pending = (window as any).pendingHighlight;
    if (!pending) return;

    await onHighlight(pending.selectedText, pending.startOffset, pending.endOffset, selectedColor);
    setShowToolbar(false);
    delete (window as any).pendingHighlight;
  };

  const handleHighlightClick = (e: React.MouseEvent, highlightId: string) => {
    e.stopPropagation();
    setSelectedHighlightId(highlightId);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setToolbarPosition({
      top: rect.top + window.scrollY - 60,
      left: rect.left + rect.width / 2,
    });
    setShowToolbar(true);
    delete (window as any).pendingHighlight;
  };

  const handleColorChange = async (color: string) => {
    if (selectedHighlightId) {
      await onUpdateHighlight(selectedHighlightId, color);
      setShowToolbar(false);
      setSelectedHighlightId(null);
    } else {
      setSelectedColor(color);
    }
  };

  const handleRemoveHighlight = async () => {
    if (selectedHighlightId) {
      await onRemoveHighlight(selectedHighlightId);
      setShowToolbar(false);
      setSelectedHighlightId(null);
    }
  };

  const renderContent = () => {
    if (!text) return null;

    const elements: JSX.Element[] = [];
    let lastIndex = 0;

    // Sort highlights and notes by position
    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
    const sortedNotes = [...notes].sort((a, b) => a.position_offset - b.position_offset);

    // Parse paragraphs
    const paragraphs = text.split(/\n\n+/);
    let currentOffset = 0;

    paragraphs.forEach((paragraph, pIndex) => {
      const paragraphStart = currentOffset;
      const paragraphEnd = currentOffset + paragraph.length;

      // Get highlights for this paragraph
      const paragraphHighlights = sortedHighlights.filter(
        (h) => h.start_offset < paragraphEnd && h.end_offset > paragraphStart
      );

      // Get notes for this paragraph
      const paragraphNotes = sortedNotes.filter(
        (n) => n.position_offset >= paragraphStart && n.position_offset <= paragraphEnd
      );

      // Render paragraph with highlights
      let paragraphElements: JSX.Element[] = [];
      let paragraphLastIndex = 0;

      paragraphHighlights.forEach((highlight) => {
        const relativeStart = Math.max(0, highlight.start_offset - paragraphStart);
        const relativeEnd = Math.min(paragraph.length, highlight.end_offset - paragraphStart);

        if (relativeStart > paragraphLastIndex) {
          paragraphElements.push(
            <span key={`text-${pIndex}-${paragraphLastIndex}`}>
              {paragraph.slice(paragraphLastIndex, relativeStart)}
            </span>
          );
        }

        const colorClass = {
          yellow: "bg-yellow-200 dark:bg-yellow-900/50",
          green: "bg-green-200 dark:bg-green-900/50",
          blue: "bg-blue-200 dark:bg-blue-900/50",
          pink: "bg-pink-200 dark:bg-pink-900/50",
          purple: "bg-purple-200 dark:bg-purple-900/50",
          orange: "bg-orange-200 dark:bg-orange-900/50",
          red: "bg-red-200 dark:bg-red-900/50",
          teal: "bg-teal-200 dark:bg-teal-900/50",
          indigo: "bg-indigo-200 dark:bg-indigo-900/50",
          lime: "bg-lime-200 dark:bg-lime-900/50",
          cyan: "bg-cyan-200 dark:bg-cyan-900/50",
          fuchsia: "bg-fuchsia-200 dark:bg-fuchsia-900/50",
          rose: "bg-rose-200 dark:bg-rose-900/50",
          amber: "bg-amber-200 dark:bg-amber-900/50",
          emerald: "bg-emerald-200 dark:bg-emerald-900/50",
        }[highlight.color] || "bg-yellow-200 dark:bg-yellow-900/50";

        paragraphElements.push(
          <mark
            key={`highlight-${highlight.id}`}
            className={`${colorClass} cursor-pointer hover:opacity-80 transition-opacity rounded-sm px-0.5`}
            onClick={(e) => handleHighlightClick(e, highlight.id)}
          >
            {paragraph.slice(relativeStart, relativeEnd)}
          </mark>
        );

        paragraphLastIndex = relativeEnd;
      });

      if (paragraphLastIndex < paragraph.length) {
        paragraphElements.push(
          <span key={`text-${pIndex}-${paragraphLastIndex}`}>
            {paragraph.slice(paragraphLastIndex)}
          </span>
        );
      }

      // Detect if paragraph is a heading
      const isHeading = paragraph.match(/^(Chapter \d+|CHAPTER \d+|\d+\.|[A-Z][A-Z\s]{10,}|[IVX]+\.|Part \d+)/i);
      
      // Check for notes in this paragraph and add indicators
      const paragraphWithNotes: JSX.Element[] = [];
      paragraphNotes.forEach((note, noteIndex) => {
        const relativeNotePos = note.position_offset - paragraphStart;
        if (relativeNotePos >= 0 && relativeNotePos <= paragraph.length) {
          paragraphWithNotes.push(
            <span
              key={`note-indicator-${note.id}`}
              className="inline-flex items-center mx-1 cursor-pointer hover:scale-110 transition-transform"
              title="Click to view note"
            >
              <Lightbulb className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            </span>
          );
        }
      });
      
      elements.push(
        <div key={`paragraph-${pIndex}`} className="mb-6">
          {isHeading ? (
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-900 scroll-mt-20 leading-snug" style={{ fontSize: `${fontSize * 1.4}px` }}>
              {paragraphElements}
              {paragraphWithNotes}
            </h2>
          ) : (
            <p className="leading-relaxed text-gray-800 dark:text-gray-800" style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}>
              {paragraphElements}
              {paragraphWithNotes}
            </p>
          )}
        </div>
      );

      currentOffset = paragraphEnd + 2; // Account for paragraph break
    });

    return elements;
  };

  return (
    <div className="relative">
      {/* Font Size Controls */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-border pb-3 mb-6 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Text size:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFontSize(Math.max(12, fontSize - 2))}
          disabled={fontSize <= 12}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[3rem] text-center">{fontSize}px</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFontSize(Math.min(28, fontSize + 2))}
          disabled={fontSize >= 28}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Floating Toolbar */}
      {showToolbar && (
        <div
          className="fixed z-50"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            transform: "translateX(-50%)",
          }}
        >
          <HighlightToolbar
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
            onRemoveHighlight={selectedHighlightId ? handleRemoveHighlight : undefined}
            showRemove={!!selectedHighlightId}
            onHighlight={!selectedHighlightId ? handleHighlight : undefined}
            onAddNote={!selectedHighlightId ? () => {
              const pending = (window as any).pendingHighlight;
              if (pending) {
                setNoteEditorOffset(pending.startOffset);
                setShowToolbar(false);
              }
            } : undefined}
          />
        </div>
      )}

      {/* Document Content */}
      <div
        ref={contentRef}
        className="prose prose-lg dark:prose-invert max-w-none select-text"
        onMouseUp={handleTextSelection}
      >
        {renderContent()}
      </div>

      {/* Note editor overlay */}
      {noteEditorOffset !== null && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center" onClick={() => setNoteEditorOffset(null)}>
          <div className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <NoteEditor
              onSave={async (content) => {
                const pending = (window as any).pendingHighlight;
                const offset = pending ? pending.startOffset : noteEditorOffset;
                await onAddNote(content, offset);
                setNoteEditorOffset(null);
                delete (window as any).pendingHighlight;
              }}
              onCancel={() => {
                setNoteEditorOffset(null);
                delete (window as any).pendingHighlight;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}