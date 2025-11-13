import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";
import { NoteDisplay } from "./NoteDisplay";

interface Note {
  id: string;
  content: string;
  position_offset: number;
}

interface NotesPanelProps {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateNote: (id: string, content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onNavigateToNote: (offset: number) => void;
}

export function NotesPanel({
  notes,
  isOpen,
  onClose,
  onUpdateNote,
  onDeleteNote,
  onNavigateToNote,
}: NotesPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-lg">My Notes</h3>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-73px)]">
        <div className="p-4 space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50 fill-yellow-400/50" />
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs mt-1">Highlight text and select "Note" to add</p>
            </div>
          ) : (
            notes
              .sort((a, b) => a.position_offset - b.position_offset)
              .map((note, index) => (
                <div
                  key={note.id}
                  className="group cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg p-4 transition-all hover:shadow-md border border-border hover:border-yellow-400"
                  onClick={() => onNavigateToNote(note.position_offset)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                      <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note {index + 1}</span>
                    </div>
                  </div>
                  <div className="pl-11">
                    <NoteDisplay
                      content={note.content}
                      onUpdate={(content) => onUpdateNote(note.id, content)}
                      onDelete={() => onDeleteNote(note.id)}
                    />
                  </div>
                </div>
              ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
