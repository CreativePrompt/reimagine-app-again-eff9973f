import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  index: number;
  offset: number;
  context: string;
}

interface SearchResultsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  results: SearchResult[];
  searchQuery: string;
  onResultClick: (index: number) => void;
  currentIndex: number;
}

export function SearchResultsSidebar({
  isOpen,
  onClose,
  results,
  searchQuery,
  onResultClick,
  currentIndex,
}: SearchResultsSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Search Results</h3>
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Results List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {results.map((result, idx) => (
              <button
                key={result.offset}
                onClick={() => onResultClick(idx)}
                className={`w-full text-left p-3 mb-2 rounded-lg border transition-all hover:bg-accent ${
                  idx === currentIndex
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      idx === currentIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {result.context.split('**').map((part, i) => 
                        i % 2 === 0 ? (
                          <span key={i}>{part}</span>
                        ) : (
                          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 font-medium px-0.5 rounded">
                            {part}
                          </mark>
                        )
                      )}
                    </p>
                  </div>
                  {idx === currentIndex && (
                    <ChevronDown className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Click on a result to navigate to that location
          </p>
        </div>
      </div>
    </>
  );
}
