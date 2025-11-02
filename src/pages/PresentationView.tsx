import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadSettings, saveSettings, PresentationSettings } from "@/lib/liveChannel";
import { Sermon, SermonBlock } from "@/lib/blockTypes";
import { extractTextLines } from "@/lib/presentationUtils";
import { supabase } from "@/integrations/supabase/client";

export default function PresentationView() {
  const { sessionId } = useParams();
  const [settings, setSettings] = useState<PresentationSettings>(loadSettings());
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const [allLines, setAllLines] = useState<Array<{ blockId: string; lineIndex: number; text: string }>>([]);

  useEffect(() => {
    // Load sermon from sessionStorage
    const storedSermon = sessionStorage.getItem(`sermon-${sessionId}`);
    if (storedSermon) {
      const parsedSermon = JSON.parse(storedSermon);
      setSermon(parsedSermon);
      
      // Extract all lines from all blocks
      const lines: Array<{ blockId: string; lineIndex: number; text: string }> = [];
      parsedSermon.blocks.forEach((block: SermonBlock) => {
        const blockLines = extractTextLines(block);
        blockLines.forEach((text, index) => {
          lines.push({ blockId: block.id, lineIndex: index, text });
        });
      });
      setAllLines(lines);
    }

    // Listen for presentation updates via Supabase Realtime
    const channel = supabase.channel(`presentation-${sessionId}`, {
      config: {
        broadcast: { self: false }
      }
    });
    
    channel
      .on('broadcast', { event: 'sermon-data' }, (payload) => {
        console.log('Received sermon data:', payload);
        const sermonData = payload.payload.sermon;
        setSermon(sermonData);
        
        // Extract all lines from all blocks
        const lines: Array<{ blockId: string; lineIndex: number; text: string }> = [];
        sermonData.blocks.forEach((block: SermonBlock) => {
          const blockLines = extractTextLines(block);
          blockLines.forEach((text: string, index: number) => {
            lines.push({ blockId: block.id, lineIndex: index, text });
          });
        });
        setAllLines(lines);
      })
      .on('broadcast', { event: 'presentation-update' }, (payload) => {
        console.log('Received message:', payload);
        const { type, blockId, lineIndex, settings: newSettings } = payload.payload;
        
        if (type === "block") {
          setCurrentBlockId(blockId);
          setCurrentLineIndex(null);
        } else if (type === "line") {
          setCurrentBlockId(blockId);
          setCurrentLineIndex(lineIndex);
        } else if (type === "clear") {
          setCurrentBlockId(null);
          setCurrentLineIndex(null);
        } else if (type === "settings") {
          setSettings(newSettings);
          saveSettings(newSettings);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Audience connected to realtime channel');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  const getCurrentContent = () => {
    if (currentBlockId === null) {
      return settings.showWaitingMessage ? "Waiting for presentation to start..." : "";
    }

    const currentLines = allLines.filter(l => l.blockId === currentBlockId);
    
    if (currentLineIndex === null) {
      // Show entire block
      return currentLines.map(l => l.text).join("\n");
    } else {
      // Show specific line
      return currentLines[currentLineIndex]?.text || "";
    }
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: settings.bgType === "solid" ? settings.bgColor : undefined,
    backgroundImage: settings.bgType === "image" && settings.bgImageDataUrl 
      ? `url(${settings.bgImageDataUrl})` 
      : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: settings.textColor,
  };

  const textStyle: React.CSSProperties = {
    textAlign: settings.align,
    fontSize: `${settings.sizeScale}em`,
    textTransform: settings.uppercase ? "uppercase" : "none",
  };

  const content = getCurrentContent();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-12 relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* Gradient overlay for better text readability */}
      {settings.bgType === "image" && settings.bgImageDataUrl && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40" />
      )}
      
      <div className="max-w-6xl w-full relative z-10">
        {content ? (
          <div className="relative">
            {/* Text backdrop for readability */}
            <div className="absolute inset-0 -m-8 bg-black/30 backdrop-blur-sm rounded-3xl" />
            
            {/* Content */}
            <div
              className="relative text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed whitespace-pre-wrap p-8"
              style={textStyle}
            >
              {content}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-block px-8 py-4 bg-black/30 backdrop-blur-sm rounded-2xl">
              <p className="text-xl md:text-2xl text-white/70">
                {settings.showWaitingMessage ? "Waiting for LIVE" : ""}
              </p>
              <p className="text-sm text-white/50 mt-2">
                The presenter will display content here when ready
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
