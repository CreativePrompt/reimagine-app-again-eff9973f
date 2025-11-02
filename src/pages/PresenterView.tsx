import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sermon, SermonBlock } from "@/lib/blockTypes";
import { extractTextLines } from "@/lib/presentationUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PresenterView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const [blockLines, setBlockLines] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    // Load sermon from sessionStorage
    const storedSermon = sessionStorage.getItem(`sermon-${sessionId}`);
    if (storedSermon) {
      const parsedSermon = JSON.parse(storedSermon);
      setSermon(parsedSermon);
      
      // Extract lines for each block
      const lines = new Map<string, string[]>();
      parsedSermon.blocks.forEach((block: SermonBlock) => {
        lines.set(block.id, extractTextLines(block));
      });
      setBlockLines(lines);
    }

    // Set up broadcast channel
    const bc = new BroadcastChannel(`presentation-${sessionId}`);
    setChannel(bc);

    return () => {
      bc.close();
    };
  }, [sessionId]);

  const sendMessage = (type: string, blockId?: string | null, lineIndex?: number | null) => {
    if (channel) {
      channel.postMessage({ type, blockId, lineIndex });
    }
  };

  const handleBlockClick = (blockId: string) => {
    setCurrentBlockId(blockId);
    setCurrentLineIndex(null);
    sendMessage("block", blockId);
  };

  const handleLineClick = (blockId: string, lineIndex: number) => {
    setCurrentBlockId(blockId);
    setCurrentLineIndex(lineIndex);
    sendMessage("line", blockId, lineIndex);
  };

  const handleClear = () => {
    setCurrentBlockId(null);
    setCurrentLineIndex(null);
    sendMessage("clear");
  };

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading presentation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit Presentation
            </Button>
            <div>
              <h1 className="font-semibold">{sermon.title}</h1>
              <p className="text-sm text-muted-foreground">Presenter View</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <Square className="h-4 w-4 mr-2" />
            Clear Screen
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {sermon.blocks.map((block) => {
            const lines = blockLines.get(block.id) || [];
            const isBlockActive = currentBlockId === block.id;
            
            return (
              <Card
                key={block.id}
                className={`p-4 cursor-pointer transition-all ${
                  isBlockActive ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleBlockClick(block.id)}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{block.kind}</Badge>
                    {isBlockActive && currentLineIndex === null && (
                      <Badge>
                        <Play className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {lines.map((line, index) => {
                      const isLineActive = isBlockActive && currentLineIndex === index;
                      
                      return (
                        <div
                          key={index}
                          className={`p-2 rounded cursor-pointer transition-all ${
                            isLineActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLineClick(block.id, index);
                          }}
                        >
                          <p className="whitespace-pre-wrap">{line}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
