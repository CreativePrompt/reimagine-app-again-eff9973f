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

        let startOffset = getOffsetFromElement(startContainer);
        let endOffset = getOffsetFromElement(endContainer);

        if (startContainer.nodeType === Node.TEXT_NODE && startContainer.parentElement) {
          startOffset += range.startOffset;
        }
        if (endContainer.nodeType === Node.TEXT_NODE && endContainer.parentElement) {
          endOffset += range.endOffset;
        } else {
          endOffset += selectedText.length;
        }

        const rect = range.getBoundingClientRect();
        const sidebar = document.createElement('div');
        sidebar.className = 'highlight-sidebar fixed z-50';
        sidebar.style.top = `${rect.bottom + window.scrollY + 10}px`;
        sidebar.style.left = `${rect.left + window.scrollX}px`;

        const root = document.getElementById('root');
        if (root) {
          root.appendChild(sidebar);
        }

        const handleHighlight = async () => {
          await onHighlight(selectedText, startOffset, endOffset, selectedColor);
          window.getSelection()?.removeAllRanges();
          sidebar.remove();
          setShowSidebar(false);
        };

        const handleAddNote = () => {
          setNoteEditorOffset(startOffset);
          window.getSelection()?.removeAllRanges();
          sidebar.remove();
          setShowSidebar(false);
        };

        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(sidebar);
          root.render(
            <HighlightToolbar
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              onHighlight={handleHighlight}
              onAddNote={handleAddNote}
            />
          );
        });

        setShowSidebar(true);
      } catch (error) {
        console.error('Selection error:', error);
      }
    }, 10);
  };

  const handleHighlightClick = (highlight: Highlight) => {
    setSelectedHighlightId(highlight.id);
    setSelectedColor(highlight.color);
    
    const highlightElement = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
    if (highlightElement) {
      const rect = highlightElement.getBoundingClientRect();
      const sidebar = document.createElement('div');
      sidebar.className = 'highlight-sidebar fixed z-50';
      sidebar.style.top = `${rect.bottom + window.scrollY + 10}px`;
      sidebar.style.left = `${rect.left + window.scrollX}px`;

      const root = document.getElementById('root');
      if (root) {
        root.appendChild(sidebar);
      }

      const handleRemove = async () => {
        await onRemoveHighlight(highlight.id);
        sidebar.remove();
        setShowSidebar(false);
        setSelectedHighlightId(null);
      };

      const handleColorChange = async (color: string) => {
        await onUpdateHighlight(highlight.id, color);
        setSelectedColor(color);
      };

      import('react-dom/client').then(({ createRoot }) => {
        const toolbarRoot = createRoot(sidebar);
        toolbarRoot.render(
          <HighlightToolbar
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
            onRemoveHighlight={handleRemove}
            showRemove
          />
        );
      });

      setShowSidebar(true);
    }
  };

  const handleNoteClick = (note: Note) => {
    setViewingNote(note);
    setEditingNoteContent(note.content);
  };

  const renderTextWithHighlights = () => {
    if (highlights.length === 0 && notes.length === 0) {
      return text.split('\n').map((paragraph, pIndex) => {
        if (!paragraph.trim()) return null;
        
        let charOffset = text.split('\n').slice(0, pIndex).join('\n').length + pIndex;
        
        return (
          <p 
            key={pIndex} 
            className="mb-4 leading-relaxed" 
            data-offset={charOffset}
          >
            {paragraph}
          </p>
        );
      });
    }

    const segments: Array<{
      text: string;
      highlight?: Highlight;
      note?: Note;
      start: number;
      end: number;
    }> = [];

    let currentPos = 0;
    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);

    sortedHighlights.forEach(highlight => {
      if (currentPos < highlight.start_offset) {
        segments.push({
          text: text.substring(currentPos, highlight.start_offset),
          start: currentPos,
          end: highlight.start_offset,
        });
      }

      segments.push({
        text: text.substring(highlight.start_offset, highlight.end_offset),
        highlight,
        start: highlight.start_offset,
        end: highlight.end_offset,
      });

      currentPos = highlight.end_offset;
    });

    if (currentPos < text.length) {
      segments.push({
        text: text.substring(currentPos),
        start: currentPos,
        end: text.length,
      });
    }

    const result: JSX.Element[] = [];
    let paragraphBuffer: JSX.Element[] = [];
    let paragraphStart = 0;

    segments.forEach((segment, idx) => {
      const lines = segment.text.split('\n');
      
      lines.forEach((line, lineIdx) => {
        if (lineIdx > 0 && paragraphBuffer.length > 0) {
          result.push(
            <p 
              key={`p-${result.length}`} 
              className="mb-4 leading-relaxed" 
              data-offset={paragraphStart}
            >
              {paragraphBuffer}
            </p>
          );
          paragraphBuffer = [];
          paragraphStart = segment.start + lines.slice(0, lineIdx).join('\n').length + lineIdx;
        }

        if (line.trim()) {
          const noteForSegment = notes.find(
            n => n.position_offset >= segment.start && n.position_offset < segment.end
          );

          if (segment.highlight) {
            paragraphBuffer.push(
              <span
                key={`seg-${idx}-${lineIdx}`}
                data-highlight-id={segment.highlight.id}
                data-offset={segment.start}
                className={`bg-${segment.highlight.color}-200 dark:bg-${segment.highlight.color}-900/50 cursor-pointer hover:opacity-80 transition-opacity relative`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHighlightClick(segment.highlight!);
                }}
              >
                {line}
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
            paragraphBuffer.push(
              <span key={`seg-${idx}-${lineIdx}`} data-offset={segment.start}>
                {line}
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
        }
      });
    });

    if (paragraphBuffer.length > 0) {
      result.push(
        <p 
          key={`p-${result.length}`} 
          className="mb-4 leading-relaxed" 
          data-offset={paragraphStart}
        >
          {paragraphBuffer}
        </p>
      );
    }

    return result;
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
        {renderTextWithHighlights()}
      </div>

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
