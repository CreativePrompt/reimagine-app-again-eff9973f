import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ListOrdered, BookOpen, Lightbulb, Target, Quote, Image as ImageIcon, FileText, StickyNote } from "lucide-react";
import { useSermonStore } from "@/lib/store/sermonStore";
import { BlockKind } from "@/lib/blockTypes";

const blockTypes: Array<{ kind: BlockKind; label: string; icon: any; description: string }> = [
  { kind: "point", label: "Point", icon: ListOrdered, description: "Add a main point" },
  { kind: "bible", label: "Scripture", icon: BookOpen, description: "Add a Bible verse" },
  { kind: "illustration", label: "Illustration", icon: Lightbulb, description: "Add a story or example" },
  { kind: "application", label: "Application", icon: Target, description: "Add practical application" },
  { kind: "quote", label: "Quote", icon: Quote, description: "Add a quote" },
  { kind: "media", label: "Media", icon: ImageIcon, description: "Add image, video, or audio" },
  { kind: "reader_note", label: "Reader Note", icon: StickyNote, description: "Add notes from reading" },
  { kind: "custom", label: "Custom", icon: FileText, description: "Add custom content" },
];

interface AddBlockMenuProps {
  afterBlockId?: string;
  pageId?: string;
  onClose?: () => void;
}

export function AddBlockMenu({ afterBlockId, pageId, onClose }: AddBlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { addBlock, currentSermon } = useSermonStore();

  const handleAddBlock = (kind: BlockKind) => {
    addBlock(kind, afterBlockId, pageId);
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full"
        size="lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Block
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Add a block</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {blockTypes.map(({ kind, label, icon: Icon, description }) => (
            <Button
              key={kind}
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-3"
              onClick={() => handleAddBlock(kind)}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {description}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
