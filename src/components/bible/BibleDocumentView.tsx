import { useState, useRef, useEffect } from "react";
import { NoteEditor } from "../commentary/NoteEditor";
import { HighlightToolbar } from "../commentary/HighlightToolbar";
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

interface BibleDocumentViewProps {
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

export function BibleDocumentView({
  text,
  highlights,
  notes,
  onHighlight,
  onRemoveHighlight,
  onUpdateHighlight,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: BibleDocumentViewProps) {
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
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === "") {
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length === 0) return;

      try {
        const range = selection.getRangeAt(0);
        let startContainer = range.startContainer;
        let endContainer = range.endContainer;

        const getOffsetFromElement = (node: Node): number => {
          let currentNode: Node | null = node;
          
          while (currentNode && currentNode !== contentRef.current) {
            if (currentNode.nodeType === Node.ELEMENT_NODE) {
              const element = currentNode as HTMLElement;
              const offset = element.getAttribute('data-offset');
              if (offset !== null) {
                return parseInt(offset, 10);
              }
            }
            currentNode = currentNode.parentNode;
          }
          return 0;
        };

        const startBaseOffset = getOffsetFromElement(startContainer);
        const endBaseOffset = getOffsetFromElement(endContainer);

        const getTextOffset = (node: Node, offset: number): number => {
          if (node.nodeType === Node.TEXT_NODE) {
            return offset;
          }
          
          let textOffset = 0;
          const childNodes = node.childNodes;
          for (let i = 0; i < offset && i < childNodes.length; i++) {
            textOffset += childNodes[i].textContent?.length || 0;
          }
          return textOffset;
        };

        const startTextOffset = getTextOffset(startContainer, range.startOffset);
        const endTextOffset = getTextOffset(endContainer, range.endOffset);

        const startOffset = startBaseOffset + startTextOffset;
        const endOffset = endBaseOffset + endTextOffset;

        setShowSidebar(true);
        setSelectedHighlightId(null);

        (window as any).pendingHighlight = { selectedText, startOffset, endOffset };
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

  const handleAddNoteClick = () => {
    const pending = (window as any).pendingHighlight;
    if (!pending) return;
    
    setNoteEditorOffset(pending.startOffset);
    setShowSidebar(false);
    delete (window as any).pendingHighlight;
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (e: React.MouseEvent, highlightId: string) => {
    e.stopPropagation();
    const highlight = highlights.find(h => h.id === highlightId);
    if (highlight) {
      setSelectedColor(highlight.color);
    }
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

  const handleNoteClick = (note: Note) => {
    setViewingNote(note);
    setEditingNoteContent(note.content);
  };

  const renderContent = () => {
    if (!text) return null;

    const elements: JSX.Element[] = [];
    
    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
    const sortedNotes = [...notes].sort((a, b) => a.position_offset - b.position_offset);

    const lines = text.split('\n');
    let currentOffset = 0;
    let currentParagraph: string[] = [];
    let paragraphStartOffset = 0;

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine) {
        if (currentParagraph.length === 0) {
          paragraphStartOffset = currentOffset;
        }
        currentParagraph.push(line);
      } else if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join('\n');
        elements.push(renderParagraph(paragraphText, paragraphStartOffset, sortedHighlights, sortedNotes));
        currentParagraph = [];
      }
      
      currentOffset += line.length + 1;
    });

    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join('\n');
      elements.push(renderParagraph(paragraphText, paragraphStartOffset, sortedHighlights, sortedNotes));
    }

    return elements;
  };

  const renderParagraph = (
    paragraphText: string,
    startOffset: number,
    sortedHighlights: Highlight[],
    sortedNotes: Note[]
  ) => {
    const endOffset = startOffset + paragraphText.length;
    
    const relevantHighlights = sortedHighlights.filter(
      h => h.start_offset < endOffset && h.end_offset > startOffset
    );
    const relevantNotes = sortedNotes.filter(
      n => n.position_offset >= startOffset && n.position_offset < endOffset
    );

    if (relevantHighlights.length === 0 && relevantNotes.length === 0) {
      return (
        <p
          key={`p-${startOffset}`}
          className="mb-4 leading-relaxed"
          data-offset={startOffset}
        >
          {paragraphText}
        </p>
      );
    }

    const segments: Array<{
      text: string;
      highlight?: Highlight;
      start: number;
      end: number;
    }> = [];

    let currentPos = startOffset;

    relevantHighlights.forEach(highlight => {
      if (currentPos < highlight.start_offset) {
        segments.push({
          text: paragraphText.substring(currentPos - startOffset, highlight.start_offset - startOffset),
          start: currentPos,
          end: highlight.start_offset,
        });
      }

      segments.push({
        text: paragraphText.substring(
          highlight.start_offset - startOffset,
          highlight.end_offset - startOffset
        ),
        highlight,
        start: highlight.start_offset,
        end: highlight.end_offset,
      });

      currentPos = highlight.end_offset;
    });

    if (currentPos < endOffset) {
      segments.push({
        text: paragraphText.substring(currentPos - startOffset),
        start: currentPos,
        end: endOffset,
      });
    }

    return (
      <p
        key={`p-${startOffset}`}
        className="mb-4 leading-relaxed"
        data-offset={startOffset}
      >
        {segments.map((segment, idx) => {
          const noteForSegment = relevantNotes.find(
            n => n.position_offset >= segment.start && n.position_offset < segment.end
          );

          if (segment.highlight) {
            return (
              <span
                key={`seg-${idx}`}
                data-highlight-id={segment.highlight.id}
                data-offset={segment.start}
                className={`bg-${segment.highlight.color}-200 dark:bg-${segment.highlight.color}-900/50 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => handleHighlightClick(e, segment.highlight!.id)}
              >
                {segment.text}
                {noteForSegment && (
                  <Lightbulb
                    className="inline-block ml-1 h-4 w-4 text-yellow-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNoteClick(noteForSegment);
                    }}
                  />
                )}
              </span>
            );
          } else {
            return (
              <span key={`seg-${idx}`} data-offset={segment.start}>
                {segment.text}
                {noteForSegment && (
                  <Lightbulb
                    className="inline-block ml-1 h-4 w-4 text-yellow-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNoteClick(noteForSegment);
                    }}
                  />
                )}
              </span>
            );
          }
        })}
      </p>
    );
  };

  return (
    <div className="relative">
      {/* Font Size Controls */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFontSize(Math.max(12, fontSize - 2))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">{fontSize}px</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFontSize(Math.min(32, fontSize + 2))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div
        ref={contentRef}
        className="max-w-4xl mx-auto p-8 select-text"
        style={{ fontSize: `${fontSize}px` }}
        onMouseUp={handleTextSelection}
      >
        {renderContent()}
      </div>

      {/* Highlight Sidebar */}
      {showSidebar && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 highlight-sidebar">
          <HighlightToolbar
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
            onHighlight={selectedHighlightId ? undefined : handleHighlight}
            onAddNote={selectedHighlightId ? undefined : handleAddNoteClick}
            onRemoveHighlight={selectedHighlightId ? handleRemoveHighlight : undefined}
            showRemove={!!selectedHighlightId}
          />
        </div>
      )}

      {/* Note Editor */}
      {noteEditorOffset !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <NoteEditor
              onCancel={() => setNoteEditorOffset(null)}
              onSave={async (content) => {
                await onAddNote(content, noteEditorOffset);
                setNoteEditorOffset(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Viewing/Editing Note */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <NoteEditor
              initialContent={editingNoteContent}
              onCancel={() => {
                setViewingNote(null);
                setEditingNoteContent("");
              }}
              onSave={async (content) => {
                await onUpdateNote(viewingNote.id, content);
                setViewingNote(null);
                setEditingNoteContent("");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
