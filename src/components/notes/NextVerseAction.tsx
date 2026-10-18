import { useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NextVerseAction({ anchor, loading, onInsert }: { anchor: HTMLElement | null; loading: boolean; onInsert: () => void }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    const update = () => {
      if (!anchor?.isConnected) { setPosition(null); return; }
      const rect = anchor.getBoundingClientRect();
      if (rect.bottom < 100 || rect.top > window.innerHeight - 60) { setPosition(null); return; }
      setPosition({ top: Math.min(window.innerHeight - 52, Math.max(100, rect.bottom + 4)), left: Math.max(8, Math.min(window.innerWidth - 150, rect.right - 140)) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [anchor]);
  if (!position) return null;
  return <div className="fixed z-40" style={position}>
    <Button size="sm" onMouseDown={event => event.preventDefault()} onClick={onInsert} disabled={loading} className="gap-2 shadow-md" aria-label="Next verse below this passage">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}Next Verse
    </Button>
  </div>;
}