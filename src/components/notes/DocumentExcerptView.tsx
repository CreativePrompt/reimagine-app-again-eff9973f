import { forwardRef, useLayoutEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import { applyEmphasisToHtml, type DocumentEmphasis } from "@/lib/documentExcerpt";
import { EMPHASIS_COLORS } from "@/components/notes/SpotlightSettingsDialog";
import "@/components/notes/RichTextEditor.css";

const hex = (id: string) => EMPHASIS_COLORS.find((c) => c.id === id)?.hex ?? '#fbbf24';
const MIN_FIT = 1, MAX_FIT = 4;

interface Props {
  html: string;
  title?: string;
  emphasis: DocumentEmphasis[];
  /** Presenter zoom multiplier applied on top of smart-fit (1 = fit). */
  zoom: number;
  /** Max height of the card as a fraction of the window height (vh). */
  maxHeightVh: number;
  /** 'full' stretches the page edge to edge; 'compact' keeps a centered 16:9 page. */
  size?: 'full' | 'compact';
  onScroll?: (ratio: number) => void;
  onMouseUp?: () => void;
}

/**
 * White document card used by both presenter popup and audience screen.
 * Smart-fit picks the largest text size that fits the card without scrolling
 * (within limits); zoom multiplies it; anything taller scrolls.
 */
export const DocumentExcerptView = forwardRef<HTMLDivElement, Props>(function DocumentExcerptView(
  { html, title, emphasis, zoom, maxHeightVh, size = 'compact', onScroll, onMouseUp }, ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement);
  const [fit, setFit] = useState(1.4);
  const rendered = useMemo(() => applyEmphasisToHtml(html, emphasis, hex), [html, emphasis]);

  // Smart fit: binary-search the font scale against the available height. Re-run on content/resize only.
  useLayoutEffect(() => {
    const scroller = scrollRef.current, body = bodyRef.current;
    if (!scroller || !body) return;
    const measure = () => {
      const avail = scroller.clientHeight || (window.innerHeight * maxHeightVh) / 100;
      let lo = MIN_FIT, hi = MAX_FIT;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        body.style.fontSize = `${mid}rem`;
        if (scroller.scrollHeight <= avail + 1) lo = mid; else hi = mid;
      }
      setFit(lo);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [html, maxHeightVh]);

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-2xl px-8 py-6 md:px-12 md:py-8"
      style={size === 'full'
        ? { width: '96vw', height: `${maxHeightVh}vh` }
        : { width: `min(98vw, ${maxHeightVh * 16 / 9}vh)`, aspectRatio: '16 / 9', maxHeight: `${maxHeightVh}vh` }}
      onScroll={(e) => {
        const el = e.currentTarget;
        const max = el.scrollHeight - el.clientHeight;
        onScroll?.(max > 0 ? el.scrollTop / max : 0);
      }}
      onMouseUp={onMouseUp}
    >
      {title && <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">{title}</p>}
      <div
        ref={bodyRef}
        className="reader-content audience-document"
        style={{ fontSize: `${fit * zoom}rem` }}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  );
});
