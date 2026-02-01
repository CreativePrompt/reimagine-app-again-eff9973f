import { Suspense, lazy, useMemo, useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import "react-quill/dist/quill.snow.css";
import "./RichTextEditor.css";
import { ScriptureToolbar } from "./ScriptureToolbar";

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
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);
    const [editorReady, setEditorReady] = useState(false);
    const lastValueRef = useRef<string>(value);

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

    // Handle paste to preserve scroll position - aggressive fix for browser extensions
    useEffect(() => {
      if (!editorReady || !quillRef.current) return;

      const quill = quillRef.current.getEditor();
      if (!quill) return;

      const handlePaste = (e: ClipboardEvent) => {
        // Store scroll positions before paste from ALL possible scroll containers
        const editorContainer = containerRef.current?.querySelector('.ql-editor') as HTMLElement;
        const pageContainer = document.querySelector('.note-editor-page') as HTMLElement;
        const mainContainer = document.querySelector('main') as HTMLElement;
        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        
        const savedPositions = {
          editor: editorContainer?.scrollTop || 0,
          page: pageContainer?.scrollTop || 0,
          main: mainContainer?.scrollTop || 0,
          scrollArea: scrollArea?.scrollTop || 0,
          window: window.scrollY,
        };

        // Aggressive restoration that fights against browser extension DOM changes
        const restoreScroll = () => {
          if (editorContainer) editorContainer.scrollTop = savedPositions.editor;
          if (pageContainer) pageContainer.scrollTop = savedPositions.page;
          if (mainContainer) mainContainer.scrollTop = savedPositions.main;
          if (scrollArea) scrollArea.scrollTop = savedPositions.scrollArea;
          window.scrollTo({ top: savedPositions.window, behavior: 'instant' });
        };

        // Use MutationObserver to catch any DOM changes that might reset scroll
        const observer = new MutationObserver(() => {
          restoreScroll();
        });

        // Watch the entire document for changes (catches Grammarly, etc.)
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        // Restore immediately
        restoreScroll();

        // Multiple restoration attempts at various intervals
        const intervals = [0, 10, 20, 50, 100, 150, 200, 300];
        const timeouts = intervals.map(delay => 
          setTimeout(restoreScroll, delay)
        );

        // Disconnect observer and clear timeouts after paste is complete
        setTimeout(() => {
          observer.disconnect();
          timeouts.forEach(clearTimeout);
        }, 500);
      };

      quill.root.addEventListener('paste', handlePaste);
      return () => {
        quill.root.removeEventListener('paste', handlePaste);
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
      }
    }), [onChange, value]);

    // Handle onChange wrapper to track content
    const handleChange = useCallback((newValue: string) => {
      lastValueRef.current = newValue;
      onChange(newValue);
    }, [onChange]);

    // Clean up ESV text - remove extra whitespace and newlines to make it a single sentence
    const cleanVerseText = (text: string): string => {
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
      const cleanedVerse = cleanVerseText(verseText);

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

    return (
      <div ref={containerRef} className="rich-text-editor-container">
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
