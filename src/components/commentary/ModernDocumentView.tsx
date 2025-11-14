import { useState, useRef, useEffect } from "react";
import { NoteEditor } from "./NoteEditor";
import { HighlightToolbar } from "./HighlightToolbar";
import { Lightbulb, ZoomIn, ZoomOut, X } from "lucide-react";
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [noteEditorOffset, setNoteEditorOffset] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const selection = window.getSelection();
      
      // Don't hide if clicking within the sidebar or if there's a text selection
      if (
        target.closest('.highlight-sidebar') || 
        (selection && selection.toString().trim() !== "")
      ) {
        return;
      }
      
      setShowSidebar(false);
      setSelectedHighlightId(null);
      window.getSelection()?.removeAllRanges();
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTextSelection = () => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === "") {
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length === 0) return;

      try {
        const range = selection.getRangeAt(0);

        // Calculate offset more robustly by getting all text content before selection
        if (contentRef.current) {
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(contentRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          
          // Get the actual text content to calculate accurate offset
          const textBeforeSelection = preSelectionRange.toString();
          const startOffset = textBeforeSelection.length;
          const endOffset = startOffset + selectedText.length;

          // Show sidebar on the right
          setShowSidebar(true);
          setSelectedHighlightId(null);

          // Save the selection info for later use
          (window as any).pendingHighlight = { selectedText, startOffset, endOffset };
        }
      } catch (error) {
        console.error("Error handling text selection:", error);
      }
    }, 50);
  };

  const handleHighlight = async () => {
    const pending = (window as any).pendingHighlight;
    if (!pending) return;

    await onHighlight(pending.selectedText, pending.startOffset, pending.endOffset, selectedColor);
    setShowSidebar(false);
    delete (window as any).pendingHighlight;
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (e: React.MouseEvent, highlightId: string) => {
    e.stopPropagation();
    setSelectedHighlightId(highlightId);
    setShowSidebar(true);
    delete (window as any).pendingHighlight;
  };

  const handleColorChange = async (color: string) => {
    if (selectedHighlightId) {
      await onUpdateHighlight(selectedHighlightId, color);
      setShowSidebar(false);
      setSelectedHighlightId(null);
    } else {
      setSelectedColor(color);
    }
  };

  const handleRemoveHighlight = async () => {
    if (selectedHighlightId) {
      await onRemoveHighlight(selectedHighlightId);
      setShowSidebar(false);
      setSelectedHighlightId(null);
    }
  };

  // Helper function to intelligently break long paragraphs
  const breakLongParagraph = (text: string, maxLength: number = 600): string[] => {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    sentences.forEach((sentence) => {
      if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    });

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  };

  const renderContent = () => {
    if (!text) return null;

    const elements: JSX.Element[] = [];
    
    // Sort highlights and notes by position
    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
    const sortedNotes = [...notes].sort((a, b) => a.position_offset - b.position_offset);

    // Split text into lines and group into logical blocks
    const lines = text.split('\n');
    let currentOffset = 0;
    let currentParagraph: string[] = [];
    let paragraphStartOffset = 0;

    const flushParagraph = (pIndex: number) => {
      if (currentParagraph.length === 0) return;

      const paragraphText = currentParagraph.join(' ').replace(/\s+/g, ' ').trim();
      const paragraphStart = paragraphStartOffset;
      const paragraphEnd = paragraphStart + paragraphText.length;

      // Detect if this is a heading (short lines, all caps, or starts with numbers/chapters)
      const isHeading = paragraphText.length < 100 && (
        /^(Chapter \d+|CHAPTER \d+|Part \d+|[IVX]+\.)/i.test(paragraphText) ||
        /^[A-Z][A-Z\s]{5,}$/.test(paragraphText.trim()) ||
        /^[\d]+\.?\s+[A-Z]/.test(paragraphText)
      );

      // Detect page markers
      const isPageMarker = /^---\s*Page\s+\d+\s*---$/i.test(paragraphText.trim());

      if (isPageMarker) {
        elements.push(
          <div key={`page-${pIndex}`} className="text-center text-muted-foreground text-sm my-8 border-t border-border pt-4">
            {paragraphText}
          </div>
        );
        currentParagraph = [];
        return;
      }

      if (isHeading) {
        const paragraphHighlights = sortedHighlights.filter(
          (h) => h.start_offset < paragraphEnd && h.end_offset > paragraphStart
        );

        const paragraphNotes = sortedNotes.filter(
          (n) => n.position_offset >= paragraphStart && n.position_offset <= paragraphEnd
        );

        const paragraphElements = renderParagraphWithHighlights(
          paragraphText,
          paragraphStart,
          paragraphHighlights,
          pIndex
        );

        const noteIndicators = paragraphNotes.map((note) => (
          <span
            key={`note-indicator-${note.id}`}
            className="inline-flex items-center mx-1 cursor-pointer hover:scale-110 transition-transform"
            title="Click to view note"
            onClick={(e) => {
              e.stopPropagation();
              setViewingNote(note);
              setEditingNoteContent(note.content);
            }}
          >
            <Lightbulb className="h-4 w-4 text-yellow-500 fill-yellow-400" />
          </span>
        ));

        elements.push(
          <h2 
            key={`heading-${pIndex}`} 
            className="text-xl font-bold mt-6 mb-3 text-foreground leading-tight"
            style={{ fontSize: `${fontSize * 1.2}px` }}
          >
            {paragraphElements}
            {noteIndicators}
          </h2>
        );
      } else {
        // Break long paragraphs into smaller chunks
        const chunks = breakLongParagraph(paragraphText);
        let chunkOffset = paragraphStart;

        chunks.forEach((chunk, chunkIndex) => {
          const chunkStart = chunkOffset;
          const chunkEnd = chunkStart + chunk.length;

          const chunkHighlights = sortedHighlights.filter(
            (h) => h.start_offset < chunkEnd && h.end_offset > chunkStart
          );

          const chunkNotes = sortedNotes.filter(
            (n) => n.position_offset >= chunkStart && n.position_offset <= chunkEnd
          );

          const chunkElements = renderParagraphWithHighlights(
            chunk,
            chunkStart,
            chunkHighlights,
            `${pIndex}-${chunkIndex}`
          );

          const noteIndicators = chunkNotes.map((note) => (
            <span
              key={`note-indicator-${note.id}`}
              className="inline-flex items-center mx-1 cursor-pointer hover:scale-110 transition-transform"
              title="Click to view note"
              onClick={(e) => {
                e.stopPropagation();
                setViewingNote(note);
                setEditingNoteContent(note.content);
              }}
            >
              <Lightbulb className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            </span>
          ));

          elements.push(
            <p 
              key={`paragraph-${pIndex}-${chunkIndex}`} 
              className="mb-4 text-foreground/90 leading-relaxed font-normal"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.8', fontWeight: 'normal' }}
            >
              {chunkElements}
              {noteIndicators}
            </p>
          );

          chunkOffset = chunkEnd + 1;
        });
      }

      currentParagraph = [];
    };

    let paragraphIndex = 0;
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // Empty line indicates paragraph break
      if (trimmedLine === '') {
        flushParagraph(paragraphIndex);
        paragraphIndex++;
        paragraphStartOffset = currentOffset + line.length + 1;
      } else {
        if (currentParagraph.length === 0) {
          paragraphStartOffset = currentOffset;
        }
        currentParagraph.push(line);
      }
      
      currentOffset += line.length + 1;
    });

    // Flush any remaining paragraph
    flushParagraph(paragraphIndex);

    return elements;
  };

  const renderParagraphWithHighlights = (
    paragraphText: string,
    paragraphStart: number,
    paragraphHighlights: Highlight[],
    pIndex: number | string
  ) => {
    const paragraphElements: JSX.Element[] = [];
    let lastIndex = 0;

    paragraphHighlights.forEach((highlight) => {
      const relativeStart = Math.max(0, highlight.start_offset - paragraphStart);
      const relativeEnd = Math.min(paragraphText.length, highlight.end_offset - paragraphStart);

      if (relativeStart > lastIndex) {
        paragraphElements.push(
          <span key={`text-${pIndex}-${lastIndex}`}>
            {paragraphText.slice(lastIndex, relativeStart)}
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
          {paragraphText.slice(relativeStart, relativeEnd)}
        </mark>
      );

      lastIndex = relativeEnd;
    });

    if (lastIndex < paragraphText.length) {
      paragraphElements.push(
        <span key={`text-${pIndex}-${lastIndex}`}>
          {paragraphText.slice(lastIndex)}
        </span>
      );
    }

    return paragraphElements;
  };

  return (
    <div className="relative flex">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
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

        {/* Document Content */}
        <div
          ref={contentRef}
          className="prose prose-lg dark:prose-invert max-w-none select-text cursor-text"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          {renderContent()}
        </div>

        {/* Note editor overlay for new notes */}
        {noteEditorOffset !== null && (
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center animate-fade-in" onClick={() => setNoteEditorOffset(null)}>
            <div className="w-full max-w-2xl mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
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

        {/* Note viewing/editing popup */}
        {viewingNote && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm" 
          onClick={() => setViewingNote(null)}
        >
          <div 
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                <h3 className="font-semibold text-lg">Note</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingNote(null)}
                className="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <textarea
                value={editingNoteContent}
                onChange={(e) => setEditingNoteContent(e.target.value)}
                className="w-full min-h-[200px] p-4 rounded-lg border border-border bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Write your note here..."
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-muted/30">
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this note?")) {
                    await onDeleteNote(viewingNote.id);
                    setViewingNote(null);
                  }
                }}
                className="text-destructive hover:bg-destructive/10"
              >
                Delete Note
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingNote(null);
                    setEditingNoteContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await onUpdateNote(viewingNote.id, editingNoteContent);
                    setViewingNote(null);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Right Sidebar for Highlighting */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-in-out highlight-sidebar ${
          showSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg">
              {selectedHighlightId ? 'Edit Highlight' : 'Highlight Text'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSidebar(false);
                setSelectedHighlightId(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Choose Color</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'yellow', class: 'bg-yellow-200 hover:bg-yellow-300' },
                  { name: 'green', class: 'bg-green-200 hover:bg-green-300' },
                  { name: 'blue', class: 'bg-blue-200 hover:bg-blue-300' },
                  { name: 'pink', class: 'bg-pink-200 hover:bg-pink-300' },
                  { name: 'purple', class: 'bg-purple-200 hover:bg-purple-300' },
                  { name: 'orange', class: 'bg-orange-200 hover:bg-orange-300' },
                  { name: 'red', class: 'bg-red-200 hover:bg-red-300' },
                  { name: 'teal', class: 'bg-teal-200 hover:bg-teal-300' },
                  { name: 'indigo', class: 'bg-indigo-200 hover:bg-indigo-300' },
                  { name: 'lime', class: 'bg-lime-200 hover:bg-lime-300' },
                  { name: 'cyan', class: 'bg-cyan-200 hover:bg-cyan-300' },
                  { name: 'fuchsia', class: 'bg-fuchsia-200 hover:bg-fuchsia-300' },
                  { name: 'rose', class: 'bg-rose-200 hover:bg-rose-300' },
                  { name: 'amber', class: 'bg-amber-200 hover:bg-amber-300' },
                  { name: 'emerald', class: 'bg-emerald-200 hover:bg-emerald-300' },
                ].map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(color.name)}
                    className={`h-10 w-10 rounded-lg ${color.class} transition-all ${
                      selectedColor === color.name
                        ? 'ring-2 ring-foreground ring-offset-2'
                        : 'ring-1 ring-border'
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!selectedHighlightId && (
                <>
                  <Button
                    onClick={handleHighlight}
                    className="w-full"
                    size="lg"
                  >
                    Apply Highlight
                  </Button>
                  <Button
                    onClick={() => {
                      const pending = (window as any).pendingHighlight;
                      if (pending) {
                        setNoteEditorOffset(pending.startOffset);
                        setShowSidebar(false);
                      }
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </>
              )}

              {selectedHighlightId && (
                <Button
                  onClick={handleRemoveHighlight}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  Remove Highlight
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}