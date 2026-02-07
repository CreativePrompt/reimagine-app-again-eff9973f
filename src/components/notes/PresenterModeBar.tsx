import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Radio, 
  Square, 
  ExternalLink, 
  Copy, 
  Check, 
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  generateSessionId, 
  createPresentationChannel, 
  broadcastSpotlightUpdate,
  broadcastInitialState,
  NotePresentationState,
  NotePresentationUpdate
} from "@/lib/notesPresentation";
import { SpotlightSettings } from "@/components/notes/SpotlightSettingsDialog";

interface PresenterModeBarProps {
  noteId: string;
  noteTitle: string;
  spotlightText: string;
  spotlightOpen: boolean;
  spotlightSettings: SpotlightSettings;
  currentPage: number;
  totalPages: number;
  emphasisList: Array<{
    start: number;
    end: number;
    text: string;
    colorId: string;
  }>;
}

export function PresenterModeBar({
  noteId,
  noteTitle,
  spotlightText,
  spotlightOpen,
  spotlightSettings,
  currentPage,
  totalPages,
  emphasisList,
}: PresenterModeBarProps) {
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [copied, setCopied] = useState(false);
  const [audienceCount, setAudienceCount] = useState(0);

  // Get the audience URL
  const getAudienceUrl = useCallback(() => {
    if (!sessionId) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/notes/live/${sessionId}`;
  }, [sessionId]);

  // Start presenter mode
  const startPresenterMode = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    
    const newChannel = createPresentationChannel(newSessionId);
    
    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        const count = Object.keys(state).length;
        setAudienceCount(count > 0 ? count - 1 : 0); // Subtract presenter
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await newChannel.track({ role: 'presenter' });
          setIsLive(true);
          setChannel(newChannel);
          
          toast({
            title: "Presenter Mode Active",
            description: "Share the audience link to start broadcasting.",
          });
        }
      });
  }, [toast]);

  // Stop presenter mode
  const stopPresenterMode = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
    }
    setChannel(null);
    setSessionId(null);
    setIsLive(false);
    setAudienceCount(0);
    
    toast({
      title: "Presenter Mode Ended",
      description: "The live broadcast has stopped.",
    });
  }, [channel, toast]);

  // Broadcast spotlight changes when they happen
  useEffect(() => {
    if (!channel || !isLive) return;

    const state: NotePresentationState = {
      noteId,
      noteTitle,
      spotlightText,
      spotlightOpen,
      spotlightSettings,
      currentPage,
      totalPages,
      emphasisList,
    };

    broadcastInitialState(channel, state);
  }, [
    channel, 
    isLive, 
    noteId, 
    noteTitle, 
    spotlightText, 
    spotlightOpen, 
    spotlightSettings, 
    currentPage, 
    totalPages, 
    emphasisList
  ]);

  // Copy audience link
  const copyAudienceLink = useCallback(() => {
    const url = getAudienceUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link Copied",
      description: "Audience link copied to clipboard.",
    });
  }, [getAudienceUrl, toast]);

  // Open audience view in new tab
  const openAudienceView = useCallback(() => {
    const url = getAudienceUrl();
    window.open(url, '_blank');
  }, [getAudienceUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  if (!isLive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={startPresenterMode}
        className="gap-2"
      >
        <Radio className="h-4 w-4" />
        Go Live
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg"
    >
      {/* Live Indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
          <div className="absolute inset-0 h-3 w-3 bg-destructive rounded-full animate-ping opacity-50" />
        </div>
        <Badge variant="destructive" className="font-semibold">
          LIVE
        </Badge>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {audienceCount > 0 ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-primary" />
            <Users className="h-3.5 w-3.5" />
            <span>{audienceCount}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Waiting...</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={copyAudienceLink}
          className="h-8 px-2"
          title="Copy audience link"
        >
        {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={openAudienceView}
          className="h-8 px-2"
          title="Open audience view"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Stop Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={stopPresenterMode}
        className="h-8 gap-1.5"
      >
        <Square className="h-3.5 w-3.5" />
        Stop
      </Button>
    </motion.div>
  );
}
