import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadSettings, saveSettings, PresentationSettings } from "@/lib/liveChannel";
import { Sermon, SermonBlock } from "@/lib/blockTypes";
import { extractTextLines } from "@/lib/presentationUtils";

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

    // Listen for presentation updates via BroadcastChannel
    const channel = new BroadcastChannel(`presentation-${sessionId}`);
    
    channel.onmessage = (event) => {
      const { type, blockId, lineIndex, settings: newSettings } = event.data;
      
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
    };

    return () => {
      channel.close();
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={backgroundStyle}
    >
      <div className="max-w-5xl w-full">
        <div
          className="text-2xl md:text-4xl lg:text-5xl font-bold leading-relaxed whitespace-pre-wrap"
          style={textStyle}
        >
          {getCurrentContent()}
        </div>
      </div>
    </div>
  );
}
