import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Trash2, Save, X } from "lucide-react";

interface NoteDisplayProps {
  content: string;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  isUpdating?: boolean;
}

export function NoteDisplay({ content, onUpdate, onDelete, isUpdating }: NoteDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = () => {
    if (editedContent.trim()) {
      onUpdate(editedContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-sm my-2">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
          Your Note
        </span>
        <div className="flex gap-1">
          {!isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!editedContent.trim() || isUpdating}
                className="h-6 w-6 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isUpdating}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="min-h-[80px] bg-white dark:bg-background"
          disabled={isUpdating}
        />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}