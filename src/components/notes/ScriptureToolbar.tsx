import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ScriptureFillButton } from "./ScriptureFillButton";
import { findScriptureReferences, normalizeReference } from "@/lib/scriptureUtils";

interface ScriptureToolbarProps {
  editorContainer: HTMLElement | null;
  onFillScripture: (reference: string, verseText: string, canonical: string) => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
  reference: string;
}

export function ScriptureToolbar({ editorContainer, onFillScripture }: ScriptureToolbarProps) {
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!editorContainer) return;

    const target = e.target as HTMLElement;
    
    // Check if we're over the editor content
    const editorContent = editorContainer.querySelector('.ql-editor');
    if (!editorContent?.contains(target)) {
      // Don't hide immediately if we're hovering over the toolbar
      if (toolbarRef.current?.contains(target)) {
        return;
      }
      
      // Delay hiding to allow moving to toolbar
      if (!hideTimeoutRef.current) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          setToolbarPosition(null);
          hideTimeoutRef.current = null;
        }, 200);
      }
      return;
    }

    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Get the text content at the cursor position
    const selection = window.getSelection();
    if (!selection) return;

    // Create a range at the mouse position
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;

    // Get the text node and its content
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) {
      setIsVisible(false);
      return;
    }

    const fullText = textNode.textContent || '';
    
    // Find scripture references in this text
    const matches = findScriptureReferences(fullText);
    if (matches.length === 0) {
      setIsVisible(false);
      return;
    }

    // Check if cursor is over any scripture reference
    const offset = range.startOffset;
    const matchAtCursor = matches.find(m => offset >= m.start && offset <= m.end);
    
    if (!matchAtCursor) {
      setIsVisible(false);
      return;
    }

    // Get the position of the reference text
    const tempRange = document.createRange();
    tempRange.setStart(textNode, matchAtCursor.start);
    tempRange.setEnd(textNode, matchAtCursor.end);
    const rect = tempRange.getBoundingClientRect();

    setToolbarPosition({
      top: rect.top - 32,
      left: rect.left + (rect.width / 2),
      reference: matchAtCursor.reference,
    });
    setIsVisible(true);
  }, [editorContainer]);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setToolbarPosition(null);
      hideTimeoutRef.current = null;
    }, 300);
  }, []);

  const handleToolbarMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editorContainer) return;

    const editorContent = editorContainer.querySelector('.ql-editor');
    if (!editorContent) return;

    editorContent.addEventListener('mousemove', handleMouseMove as EventListener);
    editorContent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      editorContent.removeEventListener('mousemove', handleMouseMove as EventListener);
      editorContent.removeEventListener('mouseleave', handleMouseLeave);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [editorContainer, handleMouseMove, handleMouseLeave]);

  const handleFill = (verseText: string, canonical: string) => {
    if (toolbarPosition) {
      onFillScripture(toolbarPosition.reference, verseText, canonical);
      setIsVisible(false);
      setToolbarPosition(null);
    }
  };

  if (!isVisible || !toolbarPosition) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseEnter={handleToolbarMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="bg-popover border rounded-lg shadow-lg p-1">
        <ScriptureFillButton
          reference={normalizeReference(toolbarPosition.reference)}
          onFill={handleFill}
        />
      </div>
    </div>,
    document.body
  );
}
