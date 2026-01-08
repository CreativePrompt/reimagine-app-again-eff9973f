import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScriptureFillButtonProps {
  reference: string;
  onFill: (verseText: string, canonical: string) => void;
  className?: string;
}

export function ScriptureFillButton({ reference, onFill, className }: ScriptureFillButtonProps) {
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState(false);
  const { toast } = useToast();

  const handleFill = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading || filled) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('esv-bible', {
        body: { 
          passage: reference, 
          includeVerseNumbers: true, 
          includeHeadings: false 
        }
      });

      if (error) throw error;

      if (data.passages && data.passages.length > 0) {
        const verseText = data.passages[0].trim();
        const canonical = data.canonical || reference;
        
        onFill(verseText, canonical);
        setFilled(true);
        
        toast({
          title: "Scripture filled",
          description: `${canonical} (ESV) has been added.`,
        });
        
        // Reset filled state after a moment
        setTimeout(() => setFilled(false), 2000);
      } else {
        toast({
          title: "No passage found",
          description: `Could not find "${reference}" in the ESV Bible.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching ESV passage:', error);
      toast({
        title: "Error fetching scripture",
        description: "Failed to fetch the scripture from ESV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFill}
            disabled={loading}
            className={`h-6 px-2 text-xs gap-1 ${className}`}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : filled ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <BookOpen className="h-3 w-3" />
            )}
            {loading ? "Loading..." : filled ? "Filled!" : "Fill ESV"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Fill in the full ESV text for {reference}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
