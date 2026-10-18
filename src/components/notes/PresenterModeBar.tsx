import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Radio, Square, ExternalLink, Copy, Users, PanelRightOpen, MonitorOff, Monitor, MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateSessionId, createPresentationChannel, broadcastInitialState, NotePresentationState } from "@/lib/notesPresentation";
import { openAudienceWindow } from "@/lib/audienceWindow";
import { SpotlightSettings } from "@/components/notes/SpotlightSettingsDialog";

interface PresenterModeBarProps {
  noteId: string;
  noteTitle: string;
  spotlightText: string;
  spotlightImage?: string | null;
  spotlightOpen: boolean;
  spotlightSettings: SpotlightSettings;
  currentPage: number;
  totalPages: number;
  emphasisList: NotePresentationState['emphasisList'];
  sidePanelOpen?: boolean;
  onSidePanelToggle?: () => void;
  onLiveStateChange?: (isLive: boolean, audienceCount: number, audienceUrl: string) => void;
  suppressPopup?: boolean;
  onSuppressPopupToggle?: () => void;
  onPrepareLive?: () => void;
}

export function PresenterModeBar({
  noteId, noteTitle, spotlightText, spotlightImage = null, spotlightOpen,
  spotlightSettings, currentPage, totalPages, emphasisList, sidePanelOpen = false,
  onSidePanelToggle, onLiveStateChange, suppressPopup = false, onSuppressPopupToggle,
  onPrepareLive,
}: PresenterModeBarProps) {
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [audienceUrl, setAudienceUrl] = useState('');
  const [audienceCount, setAudienceCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const windowRef = useRef<Window | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<NotePresentationState>({ noteId, noteTitle, spotlightText, spotlightImage,
    spotlightOpen, spotlightSettings, currentPage, totalPages, emphasisList });
  stateRef.current = { noteId, noteTitle, spotlightText, spotlightImage, spotlightOpen,
    spotlightSettings, currentPage, totalPages, emphasisList };

  useEffect(() => {
    onLiveStateChange?.(isLive, audienceCount, audienceUrl);
  }, [isLive, audienceCount, audienceUrl, onLiveStateChange]);

  const stop = useCallback(() => {
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) void supabase.removeChannel(channel);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    windowRef.current?.close();
    windowRef.current = null;
    setIsLive(false);
    setStarting(false);
    setAudienceCount(0);
    setAudienceUrl('');
  }, []);

  const openAudience = useCallback((url: string) => {
    windowRef.current = openAudienceWindow(url);
    if (!windowRef.current) toast({ title: "Audience window blocked", description: "Allow popups for this site, then choose Open audience screen from the live menu.", variant: "destructive" });
  }, [toast]);

  const start = () => {
    if (channelRef.current) return;
    const url = `${window.location.origin}/notes/live/${generateSessionId()}?fullscreen=1`;
    const sessionId = new URL(url).pathname.split('/').pop();
    if (!sessionId) return;
    // Preserve popup permission: open before switching modes or awaiting realtime.
    openAudience(url);
    onPrepareLive?.();
    setAudienceUrl(url);
    setStarting(true);
    const channel = createPresentationChannel(sessionId);
    channelRef.current = channel;
    const publish = () => broadcastInitialState(channel, stateRef.current);
    const fail = () => {
      if (channelRef.current !== channel) return;
      stop();
      toast({ title: "Couldn't start the live presentation", description: "Check your connection and click Go Live to try again.", variant: "destructive" });
    };
    timeoutRef.current = setTimeout(fail, 15000);
    channel
      .on('broadcast', { event: 'request-state' }, publish)
      .on('presence', { event: 'sync' }, () => {
        const members = Object.values(channel.presenceState()).flat() as Array<{ role?: string }>;
        setAudienceCount(members.filter(member => member.role === 'audience').length);
        publish();
      })
      .subscribe(async status => {
        if (channelRef.current !== channel) return;
        if (status === 'SUBSCRIBED') {
          try {
            const result = await channel.track({ role: 'presenter' });
            if (channelRef.current !== channel) return;
            if (result !== 'ok') { fail(); return; }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setStarting(false);
            setIsLive(true);
            publish();
          } catch { fail(); }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          fail();
        }
      });
  };

  useEffect(() => {
    if (isLive && channelRef.current) broadcastInitialState(channelRef.current, stateRef.current);
  }, [isLive, noteId, noteTitle, spotlightText, spotlightImage, spotlightOpen, spotlightSettings, currentPage, totalPages, emphasisList]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) void supabase.removeChannel(channel);
    windowRef.current?.close();
  }, []);

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button size="sm" variant={isLive ? 'destructive' : 'default'} onClick={isLive ? stop : start}
        disabled={starting} className="gap-2 font-semibold shadow-sm">
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : isLive ? <Square className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
        {starting ? 'Starting…' : isLive ? 'Stop Live' : 'Go Live'}
      </Button>
      {isLive && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Live presentation options" title="Live presentation options"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2"><Users className="h-3.5 w-3.5" />{audienceCount} audience connected</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openAudience(audienceUrl)}><ExternalLink className="h-4 w-4 mr-2" />Open audience screen</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { void navigator.clipboard.writeText(audienceUrl).then(() => toast({ title: 'Audience link copied' })).catch(() => toast({ title: "Couldn't copy the link", variant: 'destructive' })); }}><Copy className="h-4 w-4 mr-2" />Copy audience link</DropdownMenuItem>
            {onSidePanelToggle && <DropdownMenuItem onClick={onSidePanelToggle}><PanelRightOpen className="h-4 w-4 mr-2" />{sidePanelOpen ? 'Hide' : 'Show'} presenter panel</DropdownMenuItem>}
            {onSuppressPopupToggle && <DropdownMenuItem onClick={onSuppressPopupToggle}>{suppressPopup ? <Monitor className="h-4 w-4 mr-2" /> : <MonitorOff className="h-4 w-4 mr-2" />}{suppressPopup ? 'Show' : 'Hide'} spotlight popup</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
