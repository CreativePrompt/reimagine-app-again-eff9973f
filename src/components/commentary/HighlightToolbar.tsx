import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, Trash2 } from "lucide-react";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "bg-yellow-200 dark:bg-yellow-900/50", color: "yellow" },
  { name: "Green", value: "bg-green-200 dark:bg-green-900/50", color: "green" },
  { name: "Blue", value: "bg-blue-200 dark:bg-blue-900/50", color: "blue" },
  { name: "Pink", value: "bg-pink-200 dark:bg-pink-900/50", color: "pink" },
  { name: "Purple", value: "bg-purple-200 dark:bg-purple-900/50", color: "purple" },
];

interface HighlightToolbarProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  onRemoveHighlight?: () => void;
  showRemove?: boolean;
}

export function HighlightToolbar({
  selectedColor,
  onColorChange,
  onRemoveHighlight,
  showRemove = false,
}: HighlightToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-lg animate-fade-in">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Highlighter className="h-4 w-4" />
            <div className={`w-4 h-4 rounded ${HIGHLIGHT_COLORS.find(c => c.color === selectedColor)?.value}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-1">
            <p className="text-xs font-medium mb-2">Highlight Color</p>
            {HIGHLIGHT_COLORS.map((color) => (
              <Button
                key={color.color}
                variant={selectedColor === color.color ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => onColorChange(color.color)}
              >
                <div className={`w-4 h-4 rounded ${color.value}`} />
                {color.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

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