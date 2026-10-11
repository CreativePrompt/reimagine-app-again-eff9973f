import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ListPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScriptureFillButton } from "./ScriptureFillButton";
import { findScriptureReferences, normalizeReference } from "@/lib/scriptureUtils";

interface ScriptureToolbarProps {
  editorContainer: HTMLElement | null;
  onFillScripture: (reference: string, verseText: string, canonical: string) => void;
  onFillContext: (reference: string, contextText: string, contextLabel: string) => void;
}

// Surrounding passage (3 verses before and after), like the Search Bible panel.
function getContextPassage(ref: string): string | null {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:[-–](\d+))?$/);
  if (!m) return null;
  const verse = parseInt(m[3]);
  const start = Math.max(1, verse - 3);
  const end = (m[4] ? parseInt(m[4]) : verse) + 3;
  return `${m[1]} ${m[2]}:${start}-${end}`;
}

interface ToolbarPosition {
  top: number;
  left: number;
  reference: string;
}

export function ScriptureToolbar({ editorContainer, onFillScripture, onFillContext }: ScriptureToolbarProps) {
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleSelectionChange = useCallback(() => {
    if (!editorContainer) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setIsVisible(false);
      setToolbarPosition(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setIsVisible(false);
      return;
    }

    // Check if selection is within the editor
    const editorContent = editorContainer.querySelector('.ql-editor');
    if (!editorContent) return;

    const range = selection.getRangeAt(0);
    if (!editorContent.contains(range.commonAncestorContainer)) {
      setIsVisible(false);
      return;
    }

    // Check if the selected text contains a scripture reference
    const matches = findScriptureReferences(selectedText);
    
    if (matches.length === 0) {
      setIsVisible(false);
      return;
    }

    // Use the first matched reference (or the full selection if it's a valid reference)
    const reference = matches[0].reference;

    // Get position of the selection
    const rect = range.getBoundingClientRect();
    
    setToolbarPosition({
      top: rect.top - 40,
      left: rect.left + (rect.width / 2),
      reference: reference,
    });
    setIsVisible(true);
  }, [editorContainer]);

  // Handle mouse up to detect selection completion
  const handleMouseUp = useCallback(() => {
    // Small delay to let selection complete
    setTimeout(handleSelectionChange, 10);
  }, [handleSelectionChange]);

  // Handle clicking outside to close toolbar
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
      // Don't close immediately if there's still a selection
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setIsVisible(false);
        setToolbarPosition(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!editorContainer) return;

    const editorContent = editorContainer.querySelector('.ql-editor');
    if (!editorContent) return;

    // Listen for mouseup to detect selection
    editorContent.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      editorContent.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editorContainer, handleMouseUp, handleSelectionChange, handleClickOutside]);

  const pinnedRef = useRef<string | null>(null);
  if (toolbarPosition) pinnedRef.current = toolbarPosition.reference;
  const handleFill = (verseText: string, canonical: string) => {
    const reference = toolbarPosition?.reference ?? pinnedRef.current;
    if (reference) {
      onFillScripture(reference, verseText, canonical);
      setIsVisible(false);
      setToolbarPosition(null);
      // Clear the selection
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleContext = async () => {
    const reference = toolbarPosition?.reference ?? pinnedRef.current;
    if (!reference || contextLoading) return;
    const contextPassage = getContextPassage(normalizeReference(reference));
    if (!contextPassage) {
      toast({
        title: "No context available",
        description: "Could not determine the surrounding verses for this reference.",
        variant: "destructive",
      });
      return;
    }
    setContextLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('esv-bible', {
        body: { passage: contextPassage, includeVerseNumbers: true, includeHeadings: false }
      });
      if (error) throw error;
      if (data.passages && data.passages.length > 0) {
        onFillContext(reference, data.passages[0].trim(), data.canonical || contextPassage);
        setIsVisible(false);
        setToolbarPosition(null);
        window.getSelection()?.removeAllRanges();
      } else {
        toast({
          title: "No passage found",
          description: `Could not find "${contextPassage}" in the ESV Bible.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error fetching context passage:', err);
      toast({
        title: "Error fetching context",
        description: "Failed to fetch the surrounding verses from ESV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setContextLoading(false);
    }
  };

  if (!isVisible || !toolbarPosition) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      // Keep the highlighted text selected while clicking Fill ESV
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-popover border rounded-lg shadow-lg p-1.5 flex items-center gap-2">
        <span className="text-xs text-muted-foreground px-1">
          {toolbarPosition.reference}
        </span>
        <ScriptureFillButton
          reference={normalizeReference(toolbarPosition.reference)}
          onFill={handleFill}
        />
      </div>
    </div>,
    document.body
  );
}
