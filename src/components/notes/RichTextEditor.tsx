import { Suspense, lazy, useMemo, useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import "react-quill/dist/quill.snow.css";
import "./RichTextEditor.css";
import { ScriptureToolbar } from "./ScriptureToolbar";
import { BookOpen, Loader2 } from "lucide-react";
import { fetchNextVerse, cleanVerseText, findLastReference } from "@/lib/scriptureNavigation";
import { useToast } from "@/hooks/use-toast";

// Lazy load ReactQuill to avoid type conflicts during build
const ReactQuill = lazy(() => import("react-quill"));

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface RichTextEditorRef {
  insertAtCursor: (text: string) => void;
  getContent: () => string;
  getSelectedText: () => string;
  /** Returns the index of the start of the current selection (in Quill text positions). */
  getSelectionOffset: () => number;
  /** Get text snippet around a given offset (length chars before & after). */
  getSnippetAtOffset: (offset: number, length?: number) => string;
  /** Scroll the editor to a given Quill text offset. */
  scrollToOffset: (offset: number) => boolean;
  /** Fetch and append the next Scripture verse after the last reference in the doc. */
  insertNextVerse: () => Promise<void>;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);
    const [editorReady, setEditorReady] = useState(false);
    const [nextVerseLoading, setNextVerseLoading] = useState(false);
    const lastValueRef = useRef<string>(value);
    const handleInsertNextVerseRef = useRef<(() => Promise<void>) | null>(null);
    const { toast } = useToast();

    const modules = useMemo(() => ({
      toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
      clipboard: {
        matchVisual: false, // Prevents scroll issues on paste
      },
    }), []);

    const formats = [
      'header', 'font', 'size',
      'bold', 'italic', 'underline', 'strike',
      'color', 'background',
      'script',
      'list', 'bullet', 'check',
      'indent',
      'align',
      'blockquote', 'code-block',
      'link', 'image'
    ];

    // Set editor ready after mount
    useEffect(() => {
      const timer = setTimeout(() => setEditorReady(true), 500);
      return () => clearTimeout(timer);
    }, []);

    // The REAL scroll container in NoteEditor is: div.flex-1.overflow-y-auto (parent of the p-8 div)
    // We need to capture scroll position BEFORE paste and restore AFTER Quill finishes
    useEffect(() => {
      if (!editorReady || !quillRef.current) return;

      const quill = quillRef.current.getEditor();
      if (!quill) return;

      // Get the actual scroll container - the parent with overflow-y-auto
      const getScrollContainer = () => {
        // Walk up from the editor to find the scrollable parent
        let element = containerRef.current?.parentElement;
        while (element) {
          const style = window.getComputedStyle(element);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            return element;
          }
          element = element.parentElement;
        }
        return null;
      };

      let savedScrollTop = 0;
      let isPasting = false;

      // Capture scroll BEFORE anything happens
      const handleBeforePaste = () => {
        const scrollContainer = getScrollContainer();
        if (scrollContainer) {
          savedScrollTop = scrollContainer.scrollTop;
          isPasting = true;
        }
      };

      // Restore scroll after Quill processes the paste
      const handleTextChange = (delta: any, oldDelta: any, source: string) => {
        if (isPasting && source === 'user') {
          const scrollContainer = getScrollContainer();
          if (scrollContainer) {
            // Force scroll restoration synchronously
            scrollContainer.scrollTop = savedScrollTop;
            
            // Also restore after any microtasks
            queueMicrotask(() => {
              scrollContainer.scrollTop = savedScrollTop;
            });
            
            // And after any frames
            requestAnimationFrame(() => {
              scrollContainer.scrollTop = savedScrollTop;
              requestAnimationFrame(() => {
                scrollContainer.scrollTop = savedScrollTop;
                isPasting = false;
              });
            });
          }
        }
      };

      // Use 'beforeinput' which fires before paste is processed
      const handleBeforeInput = (e: InputEvent) => {
        if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromPasteAsQuotation') {
          handleBeforePaste();
        }
      };

      // Also capture on regular paste event as fallback
      const handlePaste = () => {
        handleBeforePaste();
      };

      quill.root.addEventListener('beforeinput', handleBeforeInput as EventListener);
      quill.root.addEventListener('paste', handlePaste, { capture: true });
      quill.on('text-change', handleTextChange);

      return () => {
        quill.root.removeEventListener('beforeinput', handleBeforeInput as EventListener);
        quill.root.removeEventListener('paste', handlePaste);
        quill.off('text-change', handleTextChange);
      };
    }, [editorReady]);

    // Handle blur to ensure content is saved when tab loses focus
    useEffect(() => {
      if (!editorReady || !quillRef.current) return;

      const quill = quillRef.current.getEditor();
      if (!quill) return;

      const handleBlur = () => {
        const currentContent = quill.root.innerHTML;
        if (currentContent !== lastValueRef.current) {
          lastValueRef.current = currentContent;
          onChange(currentContent);
        }
      };

      // Also sync on visibility change (tab switching)
      const handleVisibilityChange = () => {
        if (document.hidden && quillRef.current) {
          const quillInstance = quillRef.current.getEditor();
          if (quillInstance) {
            const currentContent = quillInstance.root.innerHTML;
            if (currentContent !== lastValueRef.current) {
              lastValueRef.current = currentContent;
              onChange(currentContent);
            }
          }
        }
      };

      quill.root.addEventListener('blur', handleBlur);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        quill.root.removeEventListener('blur', handleBlur);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [editorReady, onChange]);

    // Track value changes from parent
    useEffect(() => {
      lastValueRef.current = value;
    }, [value]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        if (!quillRef.current) return;
        
        const quill = quillRef.current.getEditor();
        if (!quill) return;

        // Store scroll position
        const scrollContainer = containerRef.current?.querySelector('.ql-editor');
        const scrollTop = scrollContainer?.scrollTop || 0;

        // Get current selection/cursor position
        const range = quill.getSelection();
        const cursorPosition = range ? range.index : quill.getLength();
        
        // Insert text at cursor position
        quill.insertText(cursorPosition, text);
        
        // Move cursor to end of inserted text
        quill.setSelection(cursorPosition + text.length);
        
        // Update the onChange with new content
        const newContent = quill.root.innerHTML;
        lastValueRef.current = newContent;
        onChange(newContent);

        // Restore scroll position
        requestAnimationFrame(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollTop;
          }
        });
      },
      getContent: () => {
        if (!quillRef.current) return value;
        const quill = quillRef.current.getEditor();
        return quill ? quill.root.innerHTML : value;
      },
      getSelectedText: () => {
        if (!quillRef.current) return "";
        const quill = quillRef.current.getEditor();
        if (!quill) return "";
        const range = quill.getSelection();
        if (!range || range.length === 0) return "";
        return quill.getText(range.index, range.length).trim();
      },
      getSelectionOffset: () => {
        if (!quillRef.current) return 0;
        const quill = quillRef.current.getEditor();
        if (!quill) return 0;
        const range = quill.getSelection(true);
        return range ? range.index : 0;
      },
      getSnippetAtOffset: (offset: number, length = 40) => {
        if (!quillRef.current) return "";
        const quill = quillRef.current.getEditor();
        if (!quill) return "";
        const total = quill.getLength();
        const start = Math.max(0, offset - Math.floor(length / 2));
        const end = Math.min(total, start + length);
        return quill.getText(start, end - start).replace(/\s+/g, " ").trim();
      },
      scrollToOffset: (offset: number) => {
        if (!quillRef.current) return false;
        const quill = quillRef.current.getEditor();
        if (!quill) return false;
        const safe = Math.min(Math.max(0, offset), quill.getLength() - 1);
        try {
          quill.setSelection(safe, 0, "silent");
          // Quill auto-scrolls on selection; also try to find the surrounding leaf
          const [leaf] = quill.getLeaf(safe);
          const node = leaf?.domNode as Node | undefined;
          if (node) {
            const el = node.nodeType === 1 ? (node as HTMLElement) : (node.parentElement as HTMLElement | null);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            return true;
          }
        } catch (e) {
          console.warn("scrollToOffset error", e);
        }
        return false;
      },
      insertNextVerse: async () => {
        await handleInsertNextVerseRef.current?.();
      },
    }), [onChange, value]);

    // Handle onChange wrapper to track content
    const handleChange = useCallback((newValue: string) => {
      lastValueRef.current = newValue;
      onChange(newValue);
    }, [onChange]);

    // Clean up ESV text - remove extra whitespace and newlines to make it a single sentence
    const cleanVerseTextLocal = (text: string): string => {
      return text
        .replace(/\n+/g, ' ')           // Replace newlines with spaces
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .replace(/\[\d+\]\s*/g, '')     // Remove verse number brackets like [22]
        .replace(/^\s+|\s+$/g, '')      // Trim whitespace
        .trim();
    };

    // Handle filling scripture - insert formatted verse after the reference
    const handleFillScripture = useCallback((reference: string, verseText: string, canonical: string) => {
      if (!quillRef.current) return;
      
      const quill = quillRef.current.getEditor();
      if (!quill) return;

      // Get the current content
      const content = quill.getText();
      
      // Find the reference in the text
      const refIndex = content.indexOf(reference);
      if (refIndex === -1) return;

      // Calculate position after the reference
      const insertPosition = refIndex + reference.length;

      // Clean up the verse text to be a single continuous sentence
      const cleanedVerse = cleanVerseTextLocal(verseText);

      // Create the formatted verse text
      // Format: — "verse text" (ESV)
      const formattedVerse = ` — "${cleanedVerse}" (ESV)`;

      // Insert the verse text after the reference
      quill.insertText(insertPosition, formattedVerse, {
        'color': '#4a5568',
        'italic': true,
      });

      // Update the onChange with new content
      const newContent = quill.root.innerHTML;
      lastValueRef.current = newContent;
      onChange(newContent);
    }, [onChange]);

    // Insert the next scripture verse based on the last reference in the document.
    // Formats as: italic quoted verse text on its own line, then `— Reference, ESV` citation.
    const handleInsertNextVerse = useCallback(async () => {
      if (!quillRef.current) return;
      const quill = quillRef.current.getEditor();
      if (!quill) return;

      const plain = quill.getText() as string;
      const last = findLastReference(plain);
      if (!last) {
        toast({
          title: "No Scripture reference found",
          description: "Select or insert a Scripture reference before using Next Verse.",
          variant: "destructive",
        });
        return;
      }

      setNextVerseLoading(true);
      try {
        const result = await fetchNextVerse(plain);
        if (!result) {
          toast({
            title: "End of passage",
            description: "No further verse is available after the last reference.",
            variant: "destructive",
          });
          return;
        }

        // Find end of the line that contains the last reference, insert there
        const refEnd = last.matchEnd;
        const rest = plain.slice(refEnd);
        const nlIdx = rest.indexOf("\n");
        // Walk forward past any adjacent verse-text / citation lines the user already has
        // by inserting at the end of the document — simplest, most predictable behavior.
        let insertPos = quill.getLength();
        // Ensure trailing newline exists before our block
        const fullLen = insertPos;
        const trailing = quill.getText(Math.max(0, fullLen - 2), 2);
        let prefix = "";
        if (!trailing.endsWith("\n\n")) {
          prefix = trailing.endsWith("\n") ? "\n" : "\n\n";
        }

        const cleaned = cleanVerseText(result.text);
        const verseLine = `"${cleaned}"`;
        const citationLine = `— ${result.reference}, ESV`;

        // Insert prefix (plain), then verse (italic), newline, citation (italic), newline
        let cursor = insertPos;
        if (prefix) {
          quill.insertText(cursor, prefix);
          cursor += prefix.length;
        }
        quill.insertText(cursor, verseLine, { italic: true });
        cursor += verseLine.length;
        quill.insertText(cursor, "\n");
        cursor += 1;
        quill.insertText(cursor, citationLine, { italic: true });
        cursor += citationLine.length;
        quill.insertText(cursor, "\n");
        cursor += 1;

        // Move selection to the end of the inserted block
        quill.setSelection(cursor, 0);

        // Sync value
        const newContent = quill.root.innerHTML;
        lastValueRef.current = newContent;
        onChange(newContent);

        // Scroll new content into view
        try {
          const [leaf] = quill.getLeaf(Math.max(0, cursor - 1));
          const node = leaf?.domNode as Node | undefined;
          const el = node && node.nodeType === 1 ? (node as HTMLElement) : (node?.parentElement as HTMLElement | null);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch { /* ignore */ }

        toast({
          title: "Next verse inserted",
          description: `${result.reference} (ESV) added to your notes.`,
        });
      } catch (err: any) {
        console.error("Next verse error:", err);
        if (err?.message === "NO_REFERENCE") {
          toast({
            title: "No Scripture reference found",
            description: "Select or insert a Scripture reference before using Next Verse.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Unable to retrieve the next verse",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        }
      } finally {
        setNextVerseLoading(false);
      }
    }, [onChange, toast]);

    // Keep the ref in sync so useImperativeHandle can call the latest handler.
    useEffect(() => {
      handleInsertNextVerseRef.current = handleInsertNextVerse;
    }, [handleInsertNextVerse]);

    return (
      <div ref={containerRef} className="rich-text-editor-container relative">
        {/* Next Verse button - floats over the toolbar area */}
        <button
          type="button"
          onClick={handleInsertNextVerse}
          disabled={nextVerseLoading}
          className="absolute right-2 top-1.5 z-10 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Insert next Scripture verse (ESV) after the last reference"
        >
          {nextVerseLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading next verse...
            </>
          ) : (
            <>
              <BookOpen className="h-3.5 w-3.5" />
              Next Verse
            </>
          )}
        </button>
        <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded-lg" />}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={handleChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            className="custom-quill-editor"
          />
        </Suspense>
        
        {/* Scripture hover toolbar */}
        {editorReady && containerRef.current && (
          <ScriptureToolbar
            editorContainer={containerRef.current}
            onFillScripture={handleFillScripture}
          />
        )}
      </div>
    );
  }
);
