import { useCallback, useEffect, useState } from 'react';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AudienceFullscreen() {
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [visible, setVisible] = useState(true);
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen often requires a fresh click in this window.
      setVisible(true);
    }
  }, []);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    document.addEventListener('fullscreenchange', update);
    window.addEventListener('pointermove', show);
    const timer = setTimeout(hide, 4000);
    if (new URLSearchParams(window.location.search).get('fullscreen') === '1') void enterFullscreen();
    return () => {
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', update);
      window.removeEventListener('pointermove', show);
    };
  }, [enterFullscreen]);
  if (fullscreen) return null;
  return (
    <Button size="icon" variant="secondary" onClick={() => void enterFullscreen()}
      aria-label="Enter audience fullscreen" title="Enter fullscreen"
      className={`fixed right-4 top-4 z-50 transition-opacity focus:opacity-100 ${visible ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
      <Maximize className="h-4 w-4" />
    </Button>
  );
}