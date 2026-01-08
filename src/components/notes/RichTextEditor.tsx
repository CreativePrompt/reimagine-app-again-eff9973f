import { Suspense, lazy, useMemo, useRef, useEffect, useCallback, useState } from "react";
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

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const [editorReady, setEditorReady] = useState(false);

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

    // Create the formatted verse text
    // Format: — "verse text" (ESV)
    const formattedVerse = ` — "${verseText}" (ESV)`;

    // Insert the verse text after the reference
    quill.insertText(insertPosition, formattedVerse, {
      'color': '#4a5568',
      'italic': true,
    });

    // Update the onChange with new content
    const newContent = quill.root.innerHTML;
    onChange(newContent);
  }, [onChange]);

  return (
    <div ref={containerRef} className="rich-text-editor-container">
      <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded-lg" />}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
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
