import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ListOrdered, BookOpen, Lightbulb, Target, Quote, Image as ImageIcon, FileText, StickyNote } from "lucide-react";
import { useSermonStore } from "@/lib/store/sermonStore";
import { BlockKind } from "@/lib/blockTypes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const blockTypes: Array<{ kind: BlockKind; label: string; icon: any }> = [
  { kind: "point", label: "Point", icon: ListOrdered },
  { kind: "bible", label: "Scripture", icon: BookOpen },
  { kind: "illustration", label: "Illustration", icon: Lightbulb },
  { kind: "application", label: "Application", icon: Target },
  { kind: "quote", label: "Quote", icon: Quote },
  { kind: "media", label: "Media", icon: ImageIcon },
  { kind: "reader_note", label: "Note", icon: StickyNote },
  { kind: "custom", label: "Custom", icon: FileText },
];

interface InlineAddBlockProps {
  afterBlockId?: string;
  pageId?: string;
}

export function InlineAddBlock({ afterBlockId, pageId }: InlineAddBlockProps) {
  const [open, setOpen] = useState(false);
  const { addBlock } = useSermonStore();

  const handleAddBlock = (kind: BlockKind) => {
    addBlock(kind, afterBlockId, pageId);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-center -my-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full opacity-0 group-hover/list:opacity-100 hover:opacity-100 transition-opacity"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="center">
          <div className="grid grid-cols-2 gap-1">
            {blockTypes.map(({ kind, label, icon: Icon }) => (
              <Button
                key={kind}
                variant="ghost"
                className="h-auto justify-start gap-2 p-2 text-sm"
                onClick={() => handleAddBlock(kind)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
