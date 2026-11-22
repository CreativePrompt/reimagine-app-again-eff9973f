import { Monitor, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: 'slide' | 'document';
  onChange: (mode: 'slide' | 'document') => void;
}

/** Presenter-only switch between classic Sermon Slide and Document View. Never rendered for the audience. */
export function LiveViewModeToggle({ value, onChange }: Props) {
  const item = (mode: 'slide' | 'document', label: string, Icon: typeof Monitor) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onChange(mode)}
      aria-pressed={value === mode}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        value === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-1" role="group" aria-label="Audience view style">
      {item('slide', 'Sermon Slide', Monitor)}
      {item('document', 'Document View', FileText)}
    </div>
  );
}
