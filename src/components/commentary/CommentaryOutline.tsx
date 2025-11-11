import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface OutlineItem {
  id: string;
  title: string;
  level: number;
  offset: number;
}

interface CommentaryOutlineProps {
  items: OutlineItem[];
  onNavigate: (offset: number) => void;
  currentOffset?: number;
}

export function CommentaryOutline({ items, onNavigate, currentOffset }: CommentaryOutlineProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Table of Contents</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No outline available
            </p>
          ) : (
            items.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start text-left h-auto py-2 px-2 hover:bg-accent/50 transition-colors ${
                  currentOffset === item.offset ? "bg-accent text-accent-foreground" : ""
                }`}
                style={{ paddingLeft: `${(item.level) * 12 + 8}px` }}
                onClick={() => onNavigate(item.offset)}
              >
                <ChevronRight className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="text-sm truncate">{item.title}</span>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}