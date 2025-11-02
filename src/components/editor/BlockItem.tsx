import { useState } from "react";
import { SermonBlock, BlockKind } from "@/lib/blockTypes";
import { useSermonStore } from "@/lib/store/sermonStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Edit2, Check, BookOpen, Lightbulb, Target, Quote, Image as ImageIcon, FileText, StickyNote } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockForm } from "./BlockForm";
import { BlockDisplay } from "./BlockDisplay";

interface BlockItemProps {
  block: SermonBlock;
}

const blockConfig: Record<BlockKind, { color: string; icon: any; label: string }> = {
  bible: { color: 'bg-block-bible border-block-bible-border', icon: BookOpen, label: 'Bible Passage' },
  point: { color: 'bg-block-point border-block-point-border', icon: Target, label: 'Point' },
  illustration: { color: 'bg-block-illustration border-block-illustration-border', icon: Lightbulb, label: 'Illustration' },
  application: { color: 'bg-block-application border-block-application-border', icon: Target, label: 'Application' },
  quote: { color: 'bg-muted border-muted', icon: Quote, label: 'Quote' },
  media: { color: 'bg-muted border-muted', icon: ImageIcon, label: 'Media' },
  custom: { color: 'bg-muted border-muted', icon: FileText, label: 'Custom' },
  reader_note: { color: 'bg-muted border-muted', icon: StickyNote, label: 'Reader Note' },
};

export function BlockItem({ block }: BlockItemProps) {
  const config = blockConfig[block.kind];
  const Icon = config.icon;
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
      className={`
        relative overflow-hidden group
        smooth-hover
        rounded-xl shadow-sm
        border-l-4 ${config.color}
        ${isDragging ? 'shadow-2xl scale-105' : ''}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Block Content with Icon */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {config.label}
              </span>
            </div>
            
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
            {isEditing ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(false)}
                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
              >
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-9 w-9 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
