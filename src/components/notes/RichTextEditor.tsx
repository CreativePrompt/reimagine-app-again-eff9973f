import { Suspense, lazy, useMemo, useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle, memo } from "react";
import "react-quill/dist/quill.snow.css";
import "./RichTextEditor.css";
import { ScriptureToolbar } from "./ScriptureToolbar";
import { fetchNextVerse } from "@/lib/scriptureNavigation";
import { formatScripturePassage } from "@/lib/scripturePassageText";
import { findClickedVerse, resolveVerseElement, makeNextVerseBlocks, elementPath, type NoteVerseTarget } from "@/lib/noteVerseTarget";
import { getScrollParent } from "@/lib/bookmarkOffsets";
import { useToast } from "@/hooks/use-toast";

// Lazy load ReactQuill to avoid type conflicts during build
const ReactQuill = lazy(() => import("react-quill"));

interface RichTextEditorProps {
  /**
   * Content to load into the editor. The editor is UNCONTROLLED while typing:
   * this value is only applied when it changes from the outside (note load,
   * Convert to ESV, etc.). This prevents re-render feedback loops that reset
   * the cursor/scroll and keeps typing fast in long documents.
   */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** CSS selector of the element that scrolls the document (page-style scrolling). */
  scrollingContainer?: string;
  onVerseTarget?: (target: NoteVerseTarget, anchor: HTMLElement) => void;
}

export interface RichTextEditorRef {
  insertAtCursor: (text: string) => void;
  getContent: () => string;
  getSelectedText: () => string;
  /** Returns the index of the start of the current selection (in Quill text positions). */
  getSelectionOffset: () => number;
  /** Get text snippet around a given offset (length chars before & after). */
  getSnippetAtOffset: (offset: number, length?: number) => string;
  /** Scroll the editor to a given Quill text offset (stable, no jump to top). */
  scrollToOffset: (offset: number) => boolean;
  /** Fetch and append the next Scripture verse after the last reference in the doc. */
  insertNextVerse: (target: NoteVerseTarget) => Promise<NoteVerseTarget | null>;
}

/** Strip junk that Word / browsers put in clipboard HTML. */
function sanitizeClipboardHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("style, script, meta, link, title, xml, o\\:p").forEach((n) => n.remove());
    return doc.body ? doc.body.innerHTML : html;
  } catch {
    return html;
  }
}

const RichTextEditorInner = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder, scrollingContainer, onVerseTarget }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);
    const [editorReady, setEditorReady] = useState(false);
    /** Latest HTML the editor holds (what we emitted last). */
    const lastValueRef = useRef<string>(value);
    /** Last external `value` prop applied to the editor. */
    const appliedValueRef = useRef<string>(value);
    const [initialValue] = useState(value);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const { toast } = useToast();
    const verseTargetCallback = useRef(onVerseTarget);
    verseTargetCallback.current = onVerseTarget;

    const getQuill = useCallback(() => {
      try {
        return quillRef.current?.getEditor?.() ?? null;
      } catch {
        return null;
      }
    }, []);

    const getScroller = useCallback((): HTMLElement | null => {
      if (scrollingContainer) {
        const el = document.querySelector(scrollingContainer) as HTMLElement | null;
        if (el) return el;
      }
      return getScrollParent(containerRef.current);
    }, [scrollingContainer]);

    /** Recent HTML the editor itself produced — echoes of these from the parent are ignored. */
    const emittedRef = useRef<string[]>([]);
    const emit = useCallback((html: string) => {
      if (html === lastValueRef.current) return;
      lastValueRef.current = html;
      emittedRef.current.push(html);
      if (emittedRef.current.length > 40) emittedRef.current.shift();
      onChangeRef.current(html);
    }, []);

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
        matchVisual: false,
      },
    }), []);

    const formats = useMemo(() => [
      'header', 'font', 'size',
      'bold', 'italic', 'underline', 'strike',
      'color', 'background',
      'script',
      'list', 'bullet', 'check',
      'indent',
      'align',
      'blockquote', 'code-block',
      'link', 'image'
    ], []);

    // Wait for the lazy Quill instance to exist
    useEffect(() => {
      if (editorReady) return;
      const id = window.setInterval(() => {
        if (getQuill()) {
          setEditorReady(true);
          window.clearInterval(id);
        }
      }, 50);
      return () => window.clearInterval(id);
    }, [editorReady, getQuill]);

    useEffect(() => {
      const quill = getQuill();
      if (!editorReady || !quill) return;
      const clicked = (event: MouseEvent) => {
        if (!(event.target instanceof Element)) return;
        const target = findClickedVerse(quill.root, event.target);
        const anchor = target && resolveVerseElement(quill.root, target);
        if (target && anchor) verseTargetCallback.current?.(target, anchor);
      };
      quill.root.addEventListener('click', clicked);
      return () => quill.root.removeEventListener('click', clicked);
    }, [editorReady, getQuill]);

    // Apply external value changes (note load, Convert to ESV, etc.) without
    // touching the scroll position.
    useEffect(() => {
      if (!editorReady) return;
      if (value === appliedValueRef.current) return;
      appliedValueRef.current = value;
      if (value === lastValueRef.current) return;
      // Parent echoing back something we typed earlier — never revert the editor.
      if (emittedRef.current.includes(value)) return;
      const quill = getQuill();
      if (!quill) return;
      const scroller = getScroller();
      const top = scroller?.scrollTop ?? 0;
      const sel = quill.getSelection();
      quill.setContents(quill.clipboard.convert(value || ""), "silent");
      lastValueRef.current = quill.root.innerHTML;
      if (sel) {
        const len = quill.getLength();
        quill.setSelection(Math.min(sel.index, len - 1), 0, "silent");
      }
      if (scroller) {
        scroller.scrollTop = top;
        requestAnimationFrame(() => { scroller.scrollTop = top; });
      }
    }, [value, editorReady, getQuill, getScroller]);

    // Word-like paste: insert exactly at the cursor, never jump the page.
    // Quill 1.x's default paste focuses a hidden clipboard element which makes
    // the browser scroll the page — we bypass it entirely.
    useEffect(() => {
      if (!editorReady) return;
      const quill = getQuill();
      if (!quill) return;
      const QuillClass = (quill.constructor as any);
      const Delta = QuillClass.import("delta");

      let lastRange: { index: number; length: number } | null = null;
      const onSelection = (range: any) => { if (range) lastRange = range; };
      quill.on("selection-change", onSelection);

      const ensureCaretVisible = (scroller: HTMLElement, index: number) => {
        try {
          const b = quill.getBounds(index);
          const cRect = quill.container.getBoundingClientRect();
          const sRect = scroller.getBoundingClientRect();
          const caretTop = cRect.top + b.top;
          const caretBottom = caretTop + b.height;
          const margin = 60;
          if (caretBottom > sRect.bottom - margin) {
            scroller.scrollTop += caretBottom - (sRect.bottom - margin);
          } else if (caretTop < sRect.top + margin + 60) {
            // account for sticky toolbar
            scroller.scrollTop -= (sRect.top + margin + 60) - caretTop;
          }
        } catch { /* ignore */ }
      };

      const handlePaste = (e: ClipboardEvent) => {
        const cd = e.clipboardData;
        if (!cd) return;
        const html = cd.getData("text/html");
        const text = cd.getData("text/plain");
        if (!html && !text) return; // e.g. pasted image files — let Quill handle it

        e.preventDefault();
        e.stopPropagation();

        const scroller = getScroller();
        const top = scroller?.scrollTop ?? 0;
        const range = quill.getSelection() || lastRange || { index: Math.max(0, quill.getLength() - 1), length: 0 };

        let pasted: any;
        if (html) {
          pasted = quill.clipboard.convert(sanitizeClipboardHtml(html));
        } else {
          pasted = new Delta().insert(text.replace(/\r\n?/g, "\n"));
        }

        const delta = new Delta().retain(range.index).delete(range.length).concat(pasted);
        quill.updateContents(delta, "user");
        const newIndex = range.index + pasted.length();
        quill.setSelection(newIndex, 0, "silent");

        if (scroller) {
          scroller.scrollTop = top;
          requestAnimationFrame(() => {
            scroller.scrollTop = top;
            ensureCaretVisible(scroller, newIndex);
          });
        }
        emit(quill.root.innerHTML);
      };

      // Capture phase on the root runs before Quill's own (bubble) paste handler
      quill.root.addEventListener("paste", handlePaste, { capture: true });
      return () => {
        quill.root.removeEventListener("paste", handlePaste, { capture: true } as any);
        quill.off("selection-change", onSelection);
      };
    }, [editorReady, getQuill, getScroller, emit]);

    // Save on blur / tab hide
    useEffect(() => {
      if (!editorReady) return;
      const quill = getQuill();
      if (!quill) return;
      const sync = () => emit(quill.root.innerHTML);
      const onVis = () => { if (document.hidden) sync(); };
      quill.root.addEventListener("blur", sync);
      document.addEventListener("visibilitychange", onVis);
      return () => {
        quill.root.removeEventListener("blur", sync);
        document.removeEventListener("visibilitychange", onVis);
      };
    }, [editorReady, getQuill, emit]);

    const flashLine = useCallback((index: number) => {
      const quill = getQuill();
      const container = containerRef.current;
      if (!quill || !container) return;
      try {
        const [line] = quill.getLine(index);
        const node = line?.domNode as HTMLElement | undefined;
        if (!node) return;
        const nRect = node.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.className = "bookmark-flash-overlay";
        overlay.style.top = `${nRect.top - cRect.top - 4}px`;
        overlay.style.height = `${nRect.height + 8}px`;
        container.appendChild(overlay);
        window.setTimeout(() => overlay.remove(), 1700);
      } catch { /* ignore */ }
    }, [getQuill]);

    const handleInsertNextVerse = useCallback(async (target: NoteVerseTarget): Promise<NoteVerseTarget | null> => {
      const quill = getQuill();
      if (!quill) return null;
      const anchor = resolveVerseElement(quill.root, target);
      if (!anchor) throw new Error("PASSAGE_CHANGED");
      const result = await fetchNextVerse(target.reference);
      if (!result) throw new Error("End of passage");
      // Resolve against the live editor after the request; never replace the note.
      if (!anchor.isConnected || !quill.root.contains(anchor)) throw new Error("PASSAGE_CHANGED");
      const scroller = getScroller();
      const top = scroller?.scrollTop ?? 0;
      const QuillClass = quill.constructor as any;
      const blot = QuillClass.find(anchor);
      if (!blot) throw new Error("PASSAGE_CHANGED");
      const index = quill.getIndex(blot) + blot.length();
      const holder = document.createElement('div');
      makeNextVerseBlocks(anchor, result).forEach(block => holder.appendChild(block));
      const inserted = quill.clipboard.convert(holder.innerHTML);
      const Delta = QuillClass.import('delta');
      // Quill's HTML converter removes the trailing paragraph newline. Restore
      // it so the citation cannot merge with the teaching paragraph below.
      if (!String(inserted.ops[inserted.ops.length - 1]?.insert ?? '').endsWith('\n')) inserted.insert('\n');
      quill.updateContents(new Delta().retain(index).concat(inserted), 'user');
      emit(quill.root.innerHTML);
      const [line] = quill.getLine(Math.min(index + inserted.length() - 1, quill.getLength() - 1));
      const node = line?.domNode as HTMLElement | undefined;
      if (scroller) {
        scroller.scrollTop = top;
        requestAnimationFrame(() => { scroller.scrollTop = top; });
      }
      if (!node) return null;
      const next = { reference: result.reference, path: elementPath(quill.root, node) };
      verseTargetCallback.current?.(next, node);
      return next;
    }, [getQuill, getScroller, emit]);

    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        const quill = getQuill();
        if (!quill) return;
        const scroller = getScroller();
        const top = scroller?.scrollTop ?? 0;
        // Sidebar clicks blur the editor; fall back to the last cursor position.
        const range = quill.getSelection() || quill.selection?.savedRange;
        const cursorPosition = range ? Math.min(range.index, quill.getLength() - 1) : quill.getLength() - 1;
        if (range?.length) quill.deleteText(cursorPosition, range.length, "user");
        quill.insertText(cursorPosition, text, "user");
        quill.setSelection(cursorPosition + text.length, 0, "silent");
        emit(quill.root.innerHTML);
        if (scroller) requestAnimationFrame(() => { scroller.scrollTop = top; });
      },
      getContent: () => {
        const quill = getQuill();
        return quill ? quill.root.innerHTML : lastValueRef.current;
      },
      getSelectedText: () => {
        const quill = getQuill();
        if (!quill) return "";
        const range = quill.getSelection() || quill.selection?.savedRange;
        if (!range || range.length === 0) return "";
        return quill.getText(range.index, range.length).trim();
      },
      getSelectionOffset: () => {
        const quill = getQuill();
        if (!quill) return 0;
        // Use the last known selection without focusing (focusing would scroll the page)
        const range = quill.getSelection() || quill.selection?.savedRange || null;
        return range ? range.index : 0;
      },
      getSnippetAtOffset: (offset: number, length = 40) => {
        const quill = getQuill();
        if (!quill) return "";
        const total = quill.getLength();
        const start = Math.max(0, offset - Math.floor(length / 2));
        const end = Math.min(total, start + length);
        return quill.getText(start, end - start).replace(/\s+/g, " ").trim();
      },
      scrollToOffset: (offset: number) => {
        const quill = getQuill();
        if (!quill) return false;
        const safe = Math.min(Math.max(0, offset), Math.max(0, quill.getLength() - 1));
        try {
          const scroller = getScroller();
          if (scroller) {
            const b = quill.getBounds(safe);
            const cRect = quill.container.getBoundingClientRect();
            const sRect = scroller.getBoundingClientRect();
            const y = cRect.top - sRect.top + scroller.scrollTop + b.top;
            const max = scroller.scrollHeight - scroller.clientHeight;
            const target = Math.max(0, Math.min(max, Math.round(y - scroller.clientHeight / 3)));
            // Scroll directly from the current position; clicking the same bookmark again is a no-op.
            if (Math.abs(target - scroller.scrollTop) > 2) {
              scroller.scrollTo({ top: target, behavior: "smooth" });
            }
          }
          // Place the caret there without letting the browser scroll anything.
          try {
            (quill.root as HTMLElement).focus({ preventScroll: true });
            quill.setSelection(safe, 0, "silent");
          } catch { /* ignore */ }
          flashLine(safe);
          return true;
        } catch (e) {
          console.warn("scrollToOffset error", e);
        }
        return false;
      },
      insertNextVerse: handleInsertNextVerse,
    }), [getQuill, getScroller, emit, flashLine, handleInsertNextVerse]);

    const handleChange = useCallback((newValue: string) => {
      emit(newValue);
    }, [emit]);

    const cleanVerseTextLocal = formatScripturePassage;

    // Handle filling scripture - insert formatted verse after the reference
    const handleFillScripture = useCallback((reference: string, verseText: string, canonical?: string) => {
      const quill = getQuill();
      if (!quill) return;
      const verse = cleanVerseTextLocal(verseText);
      const sel = quill.getSelection() || quill.selection?.savedRange;
      const selected = sel && sel.length > 0 ? (quill.getText(sel.index, sel.length) as string) : "";
      // Replace the highlighted text with the ESV version, in place.
      if (sel && selected.trim()) {
        const formats = quill.getFormat(sel.index, 1);
        const inline: Record<string, unknown> = {};
        ["bold", "italic", "underline", "color", "background", "font", "size"].forEach((k) => {
          if (formats[k] !== undefined) inline[k] = formats[k];
        });
        const label = (canonical || reference).trim();
        const hasQuote = /["\u201C\u201D]/.test(selected);
        const multiLine = selected.replace(/\n+$/, "").includes("\n");
        const trailingNl = /\n$/.test(selected) ? "\n" : "";
        const replacement = hasQuote || multiLine
          ? `"${verse}"\n— ${label} ESV${trailingNl}`
          : `${label} — "${verse}" (ESV)${trailingNl}`;
        const scroller = scrollingContainer ? document.querySelector(scrollingContainer) as HTMLElement | null : null;
        const top = scroller?.scrollTop ?? window.scrollY;
        quill.deleteText(sel.index, sel.length, "user");
        quill.insertText(sel.index, replacement, inline, "user");
        quill.setSelection(sel.index + replacement.length, 0, "silent");
        if (scroller) scroller.scrollTop = top; else window.scrollTo({ top });
        emit(quill.root.innerHTML);
        return;
      }
      const content = quill.getText();
      const refIndex = content.indexOf(reference);
      if (refIndex === -1) return;
      const insertPosition = refIndex + reference.length;
      const formattedVerse = ` — "${verse}" (ESV)`;
      quill.insertText(insertPosition, formattedVerse, { color: '#4a5568', italic: true });
      emit(quill.root.innerHTML);
    }, [getQuill, emit, scrollingContainer]);

    // Insert the surrounding verses (context) right after the highlighted text.
    const handleFillContext = useCallback((reference: string, contextText: string, contextLabel: string) => {
      const quill = getQuill();
      if (!quill) return;
      const verses = cleanVerseTextLocal(contextText);
      const sel = quill.getSelection() || quill.selection?.savedRange;
      const scroller = scrollingContainer ? document.querySelector(scrollingContainer) as HTMLElement | null : null;
      const top = scroller?.scrollTop ?? window.scrollY;
      let insertPosition: number;
      let inline: Record<string, unknown> = { color: '#4a5568', italic: true };
      if (sel && sel.length > 0) {
        insertPosition = sel.index + sel.length;
        const formats = quill.getFormat(sel.index, 1);
        const picked: Record<string, unknown> = {};
        ["bold", "italic", "underline", "color", "background", "font", "size"].forEach((k) => {
          if (formats[k] !== undefined) picked[k] = formats[k];
        });
        if (Object.keys(picked).length > 0) inline = picked;
      } else {
        const content = quill.getText();
        const refIndex = content.indexOf(reference);
        if (refIndex === -1) return;
        insertPosition = refIndex + reference.length;
      }
      const insertion = `\n"${verses}"\n— ${contextLabel} ESV (context)`;
      quill.insertText(insertPosition, insertion, inline, "user");
      quill.setSelection(insertPosition + insertion.length, 0, "silent");
      if (scroller) scroller.scrollTop = top; else window.scrollTo({ top });
      emit(quill.root.innerHTML);
    }, [getQuill, emit, scrollingContainer]);

    return (
      <div ref={containerRef} className="rich-text-editor-container">
        <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded-lg" />}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            defaultValue={initialValue}
            onChange={handleChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            scrollingContainer={scrollingContainer}
            className="custom-quill-editor"
          />
        </Suspense>

        {editorReady && containerRef.current && (
          <ScriptureToolbar
            editorContainer={containerRef.current}
            onFillScripture={handleFillScripture}
            onFillContext={handleFillContext}
          />
        )}
      </div>
    );
  }
);

export const RichTextEditor = memo(RichTextEditorInner);
