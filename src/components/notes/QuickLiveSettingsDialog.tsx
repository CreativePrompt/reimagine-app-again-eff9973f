import { useEffect, useState } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { connectAudienceScreens, restoreAudienceScreens, screenKey, type PresentationScreen, type QuickLiveSettings } from '@/lib/audienceWindow';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: QuickLiveSettings;
  onChange: (settings: QuickLiveSettings) => void;
}

export function QuickLiveSettingsDialog({ open, onOpenChange, settings, onChange }: Props) {
  const [screens, setScreens] = useState<PresentationScreen[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (open) void restoreAudienceScreens().then(details => { if (details) setScreens(details.screens); });
  }, [open]);
  const connect = async () => {
    setConnecting(true);
    setMessage('');
    try {
      const details = await connectAudienceScreens();
      setScreens(details.screens);
      setMessage(details.screens.length > 1 ? 'Displays connected. Your next Go Live will use the selected display.' : 'Only one display was found. Connect your secondary display and check again.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Screen access was denied. Allow it in your browser and try again.'); }
    finally { setConnecting(false); }
  };
  const selectedExists = ['secondary', 'current'].includes(settings.screen) || screens.some(screen => screenKey(screen) === settings.screen);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Quick Live settings</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="quick-live-screen">Audience display</Label>
            <Select value={settings.screen} onValueChange={screen => onChange({ ...settings, screen })}>
              <SelectTrigger id="quick-live-screen"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="secondary">Secondary display (default)</SelectItem>
                <SelectItem value="current">Current display</SelectItem>
                {screens.map((screen, index) => <SelectItem key={screenKey(screen)} value={screenKey(screen)}>{screen.label || `Display ${index + 1}`} · {screen.width} × {screen.height}{screen.isPrimary ? ' · Primary' : ''}</SelectItem>)}
                {!selectedExists && <SelectItem value={settings.screen}>Saved display (disconnected)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="quick-live-fullscreen">Open audience in fullscreen</Label>
            <Switch id="quick-live-fullscreen" checked={settings.fullscreen} onCheckedChange={fullscreen => onChange({ ...settings, fullscreen })} />
          </div>
          <div className="space-y-3 border-t pt-4">
            <Button variant="outline" onClick={() => void connect()} disabled={connecting} className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Monitor className="h-4 w-4" />}
              {connecting ? 'Connecting…' : screens.length ? 'Refresh displays' : 'Connect displays'}
            </Button>
            <p className="text-sm text-muted-foreground">Allow screen access once in Chrome or Edge. Automatic fullscreen depends on browser support; otherwise the audience screen offers a fullscreen button.</p>
            {message && <p role="status" className="text-sm">{message}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}