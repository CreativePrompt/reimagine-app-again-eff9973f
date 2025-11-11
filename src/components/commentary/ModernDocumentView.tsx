import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StickyNote, Highlighter } from "lucide-react";
import { NoteEditor } from "./NoteEditor";
import { NoteDisplay } from "./NoteDisplay";
import { HighlightToolbar } from "./HighlightToolbar";

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
        top: rect.top - 60,
        left: rect.left + rect.width / 2,
      });
      setShowToolbar(true);

      // Save the selection info for later use
      (window as any).pendingHighlight = { selectedText, startOffset, endOffset };
    }

    selection.removeAllRanges();
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
      top: rect.top - 60,
      left: rect.left + rect.width / 2,
    });
    setShowToolbar(true);
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
      const isHeading = paragraph.match(/^(Chapter \d+|CHAPTER \d+|\d+\.|[A-Z][A-Z\s]{10,})/);
      
      elements.push(
        <div key={`paragraph-${pIndex}`} className="mb-6">
          {isHeading ? (
            <h2 className="text-2xl font-bold mb-4 text-foreground scroll-mt-20">
              {paragraphElements}
            </h2>
          ) : (
            <p className="text-base leading-relaxed text-foreground/90">
              {paragraphElements}
            </p>
          )}
          
          {/* Add note button at end of paragraph */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setNoteEditorOffset(paragraphEnd)}
          >
            <StickyNote className="h-3 w-3" />
            <span className="text-xs">Add note</span>
          </Button>

          {/* Render notes for this paragraph */}
          {paragraphNotes.map((note) => (
            <NoteDisplay
              key={note.id}
              content={note.content}
              onUpdate={(content) => onUpdateNote(note.id, content)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))}

          {/* Note editor */}
          {noteEditorOffset === paragraphEnd && (
            <NoteEditor
              onSave={async (content) => {
                await onAddNote(content, paragraphEnd);
                setNoteEditorOffset(null);
              }}
              onCancel={() => setNoteEditorOffset(null)}
            />
          )}
        </div>
      );

      currentOffset = paragraphEnd + 2; // Account for paragraph break
    });

    return elements;
  };

  return (
    <div className="relative">
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
          />
          
          {!selectedHighlightId && (
            <Button
              size="sm"
              className="ml-2"
              onClick={handleHighlight}
            >
              <Highlighter className="h-4 w-4 mr-2" />
              Highlight
            </Button>
          )}
        </div>
      )}

      {/* Document Content */}
      <div
        ref={contentRef}
        className="prose prose-lg dark:prose-invert max-w-none"
        onMouseUp={handleTextSelection}
      >
        {renderContent()}
      </div>
    </div>
  );
}