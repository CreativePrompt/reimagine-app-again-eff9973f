import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react";

interface NoteEditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function NoteEditor({ initialContent = "", onSave, onCancel, isSaving }: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-lg animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Add Note
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note here..."
        className="mb-2 min-h-[100px] bg-white dark:bg-background"
        autoFocus
      />
      
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!content.trim() || isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Note"}
        </Button>
      </div>
    </div>
  );
}