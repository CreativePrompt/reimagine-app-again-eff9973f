import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, Trash2, StickyNote } from "lucide-react";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "bg-yellow-200 dark:bg-yellow-900/50", color: "yellow" },
  { name: "Green", value: "bg-green-200 dark:bg-green-900/50", color: "green" },
  { name: "Blue", value: "bg-blue-200 dark:bg-blue-900/50", color: "blue" },
  { name: "Pink", value: "bg-pink-200 dark:bg-pink-900/50", color: "pink" },
  { name: "Purple", value: "bg-purple-200 dark:bg-purple-900/50", color: "purple" },
  { name: "Orange", value: "bg-orange-200 dark:bg-orange-900/50", color: "orange" },
  { name: "Red", value: "bg-red-200 dark:bg-red-900/50", color: "red" },
  { name: "Teal", value: "bg-teal-200 dark:bg-teal-900/50", color: "teal" },
  { name: "Indigo", value: "bg-indigo-200 dark:bg-indigo-900/50", color: "indigo" },
  { name: "Lime", value: "bg-lime-200 dark:bg-lime-900/50", color: "lime" },
  { name: "Cyan", value: "bg-cyan-200 dark:bg-cyan-900/50", color: "cyan" },
  { name: "Fuchsia", value: "bg-fuchsia-200 dark:bg-fuchsia-900/50", color: "fuchsia" },
  { name: "Rose", value: "bg-rose-200 dark:bg-rose-900/50", color: "rose" },
  { name: "Amber", value: "bg-amber-200 dark:bg-amber-900/50", color: "amber" },
  { name: "Emerald", value: "bg-emerald-200 dark:bg-emerald-900/50", color: "emerald" },
];

interface HighlightToolbarProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  onRemoveHighlight?: () => void;
  showRemove?: boolean;
  onHighlight?: () => void;
  onAddNote?: () => void;
}

export function HighlightToolbar({
  selectedColor,
  onColorChange,
  onRemoveHighlight,
  showRemove = false,
  onHighlight,
  onAddNote,
}: HighlightToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-lg animate-fade-in">
      {!showRemove && onHighlight && (
        <Button 
          size="sm" 
          onClick={onHighlight}
          className="gap-2"
        >
          <Highlighter className="h-4 w-4" />
          Highlight
        </Button>
      )}

      {!showRemove && onAddNote && (
        <Button 
          size="sm" 
          variant="outline"
          onClick={onAddNote}
          className="gap-2"
        >
          <StickyNote className="h-4 w-4" />
          Note
        </Button>
      )}

      {(showRemove || !onHighlight) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Highlighter className="h-4 w-4" />
              <div className={`w-4 h-4 rounded ${HIGHLIGHT_COLORS.find(c => c.color === selectedColor)?.value}`} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-3">Highlight Color</p>
              <div className="grid grid-cols-3 gap-2">
                {HIGHLIGHT_COLORS.map((color) => (
                  <Button
                    key={color.color}
                    variant={selectedColor === color.color ? "default" : "ghost"}
                    size="sm"
                    className="justify-start gap-2 h-auto py-2"
                    onClick={() => onColorChange(color.color)}
                  >
                    <div className={`w-5 h-5 rounded ${color.value}`} />
                    <span className="text-xs">{color.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {showRemove && onRemoveHighlight && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRemoveHighlight}
          className="gap-2 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      )}
    </div>
  );
}