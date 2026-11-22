import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Maximize2, Eraser, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentExcerptView } from "@/components/notes/DocumentExcerptView";
import { EMPHASIS_COLORS, type SpotlightSettings } from "@/components/notes/SpotlightSettingsDialog";
import type { NotePresentationState } from "@/lib/notesPresentation";

type Emphasis = NotePresentationState['emphasisList'][number];
export const DOC_ZOOM_MIN = 0.5, DOC_ZOOM_MAX = 2.5, DOC_ZOOM_STEP = 0.1;

interface Props {
  isOpen: boolean;
  html: string;
  title: string;
  settings: SpotlightSettings;
  emphasisList: Emphasis[];
  onEmphasisChange: (list: Emphasis[]) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onScrollChange: (ratio: number) => void;
  onClose: () => void;
}

/** Presenter copy of the audience Document View: same card, plus zoom and live highlight tools. */
export function DocumentSpotlightPopup({ isOpen, html, title, settings, emphasisList, onEmphasisChange, zoom, onZoomChange, onScrollChange, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const clamp = (z: number) => Math.round(Math.min(DOC_ZOOM_MAX, Math.max(DOC_ZOOM_MIN, z)) * 10) / 10;

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [html]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) onZoomChange(clamp(zoom + DOC_ZOOM_STEP));
      else if (e.key === '-' && !e.metaKey && !e.ctrlKey) onZoomChange(clamp(zoom - DOC_ZOOM_STEP));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, zoom, onClose, onZoomChange]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().replace(/\s+/g, ' ').trim();
    if (!sel || !text || !scrollRef.current?.contains(sel.anchorNode)) return;
    const colorId = EMPHASIS_COLORS.some((c) => c.id === settings.defaultEmphasisColor) ? settings.defaultEmphasisColor : 'yellow';
    sel.removeAllRanges();
    if (emphasisList.some((e) => e.text === text)) return;
    const next = { start: 0, end: 0, text, colorId };
    onEmphasisChange(settings.multiEmphasisEnabled === false ? [next] : [...emphasisList, next]);
  }, [emphasisList, onEmphasisChange, settings.defaultEmphasisColor, settings.multiEmphasisEnabled]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const mark = (e.target as HTMLElement).closest('mark[data-emphasis]');
    if (!mark) return;
    const t = mark.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    onEmphasisChange(emphasisList.filter((x) => !x.text.includes(t)));
  }, [emphasisList, onEmphasisChange]);

  return (
    <AnimatePresence>
      {isOpen && html && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 shadow-lg">
              <FileText className="h-4 w-4 text-primary" />
              <div className="mr-auto leading-tight">
                <p className="text-sm font-semibold">Document View</p>
                <p className="text-xs text-muted-foreground">Select text to highlight it for the audience · click a highlight to remove it</p>
              </div>
              <Button size="icon" variant="outline" aria-label="Zoom out" onClick={() => onZoomChange(clamp(zoom - DOC_ZOOM_STEP))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="outline" aria-label="Zoom in" onClick={() => onZoomChange(clamp(zoom + DOC_ZOOM_STEP))}><ZoomIn className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => onZoomChange(1)}><Maximize2 className="h-4 w-4 mr-1" />Fit</Button>
              <Button size="sm" variant="outline" disabled={emphasisList.length === 0} onClick={() => onEmphasisChange([])}><Eraser className="h-4 w-4 mr-1" />Clear</Button>
              <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
            <div onClick={handleClick} className="flex justify-center">
              <DocumentExcerptView
                ref={scrollRef}
                html={html}
                title={title}
                emphasis={emphasisList}
                zoom={zoom}
                maxHeightVh={82}
                onScroll={onScrollChange}
                onMouseUp={handleMouseUp}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
