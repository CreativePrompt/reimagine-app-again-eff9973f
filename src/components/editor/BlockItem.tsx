import { useState } from "react";
import { SermonBlock } from "@/lib/blockTypes";
import { useSermonStore } from "@/lib/store/sermonStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Edit2, Check } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockForm } from "./BlockForm";
import { BlockDisplay } from "./BlockDisplay";

interface BlockItemProps {
  block: SermonBlock;
}

export function BlockItem({ block }: BlockItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { deleteBlock } = useSermonStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this block?")) {
      deleteBlock(block.id);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="group relative hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-card/50 backdrop-blur"
    >
      <div className="flex items-start gap-3 p-5">
        {/* Drag Handle */}
        <button
          className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <BlockForm
              block={block}
              onComplete={() => setIsEditing(false)}
            />
          ) : (
            <BlockDisplay block={block} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
