import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sermon, SermonBlock, BlockKind } from "@/lib/blockTypes";
import { extractTextLines, extractBlockTitle, extractBlockContent } from "@/lib/presentationUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Square, Eye, Maximize2, Minimize2, Edit, Settings, Trash2, Plus, X, Check, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PresentationSettingsDialog } from "@/components/editor/PresentationSettingsDialog";
import { loadSettings, saveSettings, PresentationSettings } from "@/lib/liveChannel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { InlineBlockEdit } from "@/components/editor/InlineBlockEdit";
import { BlockDisplay } from "@/components/editor/BlockDisplay";
import { PresenterTimer } from "@/components/editor/PresenterTimer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PresenterView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<"title" | "content" | "both">("title");
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [blockLines, setBlockLines] = useState<Map<string, string[]>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAudiencePreview, setShowAudiencePreview] = useState(true);
  const [settings, setSettings] = useState<PresentationSettings>(loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showEndLiveDialog, setShowEndLiveDialog] = useState(false);

  useEffect(() => {
    // Load sermon from sessionStorage
    const storedSermon = sessionStorage.getItem(`sermon-${sessionId}`);
    let sermonData: Sermon | null = null;
    
    if (storedSermon) {
      const parsedSermon = JSON.parse(storedSermon);
      sermonData = parsedSermon;
      setSermon(parsedSermon);
      
      // Extract lines for each block
      const lines = new Map<string, string[]>();
      parsedSermon.blocks.forEach((block: SermonBlock) => {
        lines.set(block.id, extractTextLines(block));
      });
      setBlockLines(lines);
    }

    // Set up Supabase Realtime channel for cross-device broadcasting
    const realtimeChannel = supabase.channel(`presentation-${sessionId}`, {
      config: {
        broadcast: { self: true }
      }
    });

    realtimeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Presenter connected to realtime channel');
        // Broadcast sermon data to all connected clients
        if (sermonData) {
          realtimeChannel.send({
            type: 'broadcast',
            event: 'sermon-data',
            payload: { sermon: sermonData }
          });
        }
        // Broadcast current settings to ensure audience has latest background/styling
        const currentSettings = loadSettings();
        realtimeChannel.send({
          type: 'broadcast',
          event: 'presentation-update',
          payload: { type: 'settings', settings: currentSettings }
        });
      }
    });

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [sessionId]);

  const sendMessage = (type: string, blockId?: string | null, lineIndex?: number | null, mode?: "title" | "content" | "both") => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'presentation-update',
        payload: { type, blockId, lineIndex, displayMode: mode }
      });
      console.log('Sent message:', { type, blockId, lineIndex, displayMode: mode });
    }
  };

  const handleBlockClick = (blockId: string) => {
    // Toggle: if clicking the same block, clear it
    if (currentBlockId === blockId && currentLineIndex === null) {
      handleClear();
    } else {
      setCurrentBlockId(blockId);
      setCurrentLineIndex(null);
      // Default to "title" mode when clicking a block
      setDisplayMode("title");
      sendMessage("block", blockId, null, "title");
    }
  };

  const handleLineClick = (blockId: string, lineIndex: number) => {
    // Toggle: if clicking the same line, clear it
    if (currentBlockId === blockId && currentLineIndex === lineIndex) {
      handleClear();
    } else {
      setCurrentBlockId(blockId);
      setCurrentLineIndex(lineIndex);
      sendMessage("line", blockId, lineIndex);
    }
  };

  const handleClear = () => {
    setCurrentBlockId(null);
    setCurrentLineIndex(null);
    sendMessage("clear");
  };

  const handleEndLive = () => {
    // Close channel and navigate back to sermon page
    if (channel) {
      channel.unsubscribe();
    }
    sessionStorage.removeItem(`sermon-${sessionId}`);
    navigate(`/sermon/${sermon?.id}`);
    toast.success("Live session ended");
  };

  const handleSettingsSave = (newSettings: PresentationSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    // Broadcast settings to audience
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'presentation-update',
        payload: { type: 'settings', settings: newSettings }
      });
    }
  };

  const handleEditSermon = () => {
    setEditMode(!editMode);
  };

  const updateSermonData = (updatedSermon: Sermon) => {
    setSermon(updatedSermon);
    sessionStorage.setItem(`sermon-${sessionId}`, JSON.stringify(updatedSermon));
    
    // Refresh block lines
    const lines = new Map<string, string[]>();
    updatedSermon.blocks.forEach((block: SermonBlock) => {
      lines.set(block.id, extractTextLines(block));
    });
    setBlockLines(lines);

    // Broadcast sermon updates to audience
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'sermon-data',
        payload: { sermon: updatedSermon }
      });
    }
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<SermonBlock>) => {
    if (!sermon) return;
    const updatedBlocks = sermon.blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } as SermonBlock : block
    );
    updateSermonData({ ...sermon, blocks: updatedBlocks });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!sermon) return;
    const updatedBlocks = sermon.blocks.filter(block => block.id !== blockId);
    updateSermonData({ ...sermon, blocks: updatedBlocks });
    toast.success("Block deleted");
  };

  const handleAddBlock = (kind: BlockKind) => {
    if (!sermon) return;
    
    let newBlock: SermonBlock;
    const baseId = nanoid();
    const order = sermon.blocks.length;
    
    switch (kind) {
      case "point":
        newBlock = { id: baseId, kind: "point", order, title: "", body: "", number: null };
        break;
      case "bible":
        newBlock = { id: baseId, kind: "bible", order, reference: "", text: "", translation: null, notes: null };
        break;
      case "illustration":
        newBlock = { id: baseId, kind: "illustration", order, title: "", body: "" };
        break;
      case "application":
        newBlock = { id: baseId, kind: "application", order, title: "", body: "" };
        break;
      case "quote":
        newBlock = { id: baseId, kind: "quote", order, text: "", author: null, source: null };
        break;
      case "media":
        newBlock = { id: baseId, kind: "media", order, type: "image", url: "", caption: null };
        break;
      case "reader_note":
        newBlock = { id: baseId, kind: "reader_note", order, title: "", summary: "", author: null, source: null };
        break;
      case "custom":
        newBlock = { id: baseId, kind: "custom", order, title: "", body: "" };
        break;
    }
    
    const updatedBlocks = [...sermon.blocks, newBlock];
    updateSermonData({ ...sermon, blocks: updatedBlocks });
    setEditingBlockId(newBlock.id);
    toast.success("Block added");
  };

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading presentation...</p>
      </div>
    );
  }

  const getCurrentContent = () => {
    if (currentBlockId === null) return null;
    
    const block = sermon?.blocks.find(b => b.id === currentBlockId);
    if (!block) return null;
    
    // For line-by-line mode (expanded mode)
    if (currentLineIndex !== null) {
      const lines = blockLines.get(currentBlockId) || [];
      return lines[currentLineIndex] || "";
    }
    
    // For block mode with display options - match PresentationView logic exactly
    if (displayMode === "title") {
      return extractBlockTitle(block);
    } else if (displayMode === "content") {
      const content = extractBlockContent(block);
      return content.join("\n");
    } else { // both
      const title = extractBlockTitle(block);
      const content = extractBlockContent(block);
      return title ? `${title}\n\n${content.join("\n")}` : content.join("\n");
    }
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: settings.bgType === "solid" ? settings.bgColor : undefined,
    backgroundImage: settings.bgType === "image" && settings.bgImageDataUrl 
      ? `url(${settings.bgImageDataUrl})` 
      : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
            <div className="flex items-center gap-3">
              <Badge variant="destructive" className="animate-pulse rounded-full">
                <div className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse" />
                LIVE
              </Badge>
              {editMode ? (
                <div className="space-y-1">
                  <Input
                    value={sermon.title}
                    onChange={(e) => {
                      if (sermon) {
                        updateSermonData({ ...sermon, title: e.target.value });
                      }
                    }}
                    placeholder="Sermon Title"
                    className="h-8 font-semibold"
                  />
                  <Input
                    value={sermon.subtitle || ""}
                    onChange={(e) => {
                      if (sermon) {
                        updateSermonData({ ...sermon, subtitle: e.target.value });
                      }
                    }}
                    placeholder="Subtitle (optional)"
                    className="h-7 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="font-semibold">{sermon.title}</h1>
                  {sermon.subtitle && (
                    <p className="text-sm text-muted-foreground">{sermon.subtitle}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={handleEditSermon}
              className="rounded-xl"
            >
              {editMode ? <Check className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {editMode ? "Done Editing" : "Edit Sermon"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="rounded-xl"
            >
              <Settings className="h-4 w-4 mr-2" />
              Presentation Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="rounded-xl"
            >
              Clear Screen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAudiencePreview(!showAudiencePreview)}
              className="rounded-xl"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showAudiencePreview ? "Hide" : "Show"} Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-xl"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
              {isExpanded ? "Compact" : "Expand"} Layout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Blocks Section - Scrollable */}
        <ResizablePanel defaultSize={showAudiencePreview ? 65 : 100} minSize={30}>
          <div className="h-full overflow-y-auto p-6">
            <div className="space-y-4">
            {sermon.blocks.map((block) => {
              const lines = blockLines.get(block.id) || [];
              const isBlockActive = currentBlockId === block.id;
              
              return (
                <Card
                  key={block.id}
                  className={`
                    overflow-hidden rounded-2xl transition-all duration-300
                    ${!editMode && 'cursor-pointer'}
                    ${isBlockActive 
                      ? "ring-4 ring-live-active shadow-xl shadow-live-active/20" 
                      : "hover:shadow-lg"
                    }
                  `}
                  onClick={() => !editMode && handleBlockClick(block.id)}
                >
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      {isBlockActive && !editMode && !isExpanded && (
                        <>
                          <div className="flex items-center gap-2 px-3 py-1 bg-live-active rounded-full">
                            <Play className="h-3 w-3 text-white fill-white animate-pulse" />
                            <span className="text-xs font-semibold text-white uppercase tracking-wide">
                              Broadcasting
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                            <Button
                              size="sm"
                              variant={displayMode === "title" ? "default" : "ghost"}
                              className="h-7 px-3 text-xs rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDisplayMode("title");
                                sendMessage("block", block.id, null, "title");
                              }}
                            >
                              Title
                            </Button>
                            <Button
                              size="sm"
                              variant={displayMode === "content" ? "default" : "ghost"}
                              className="h-7 px-3 text-xs rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDisplayMode("content");
                                sendMessage("block", block.id, null, "content");
                              }}
                            >
                              Content
                            </Button>
                            <Button
                              size="sm"
                              variant={displayMode === "both" ? "default" : "ghost"}
                              className="h-7 px-3 text-xs rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDisplayMode("both");
                                sendMessage("block", block.id, null, "both");
                              }}
                            >
                              Both
                            </Button>
                          </div>
                        </>
                      )}
                      {isBlockActive && !editMode && isExpanded && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-live-active rounded-full">
                          <Play className="h-3 w-3 text-white fill-white animate-pulse" />
                          <span className="text-xs font-semibold text-white uppercase tracking-wide">
                            Broadcasting
                          </span>
                        </div>
                      )}
                      {!isBlockActive && !editMode && (
                        <button className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                          <Play className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Click to Broadcast
                          </span>
                        </button>
                      )}
                      <Badge variant="outline" className="rounded-full">
                        {block.kind}
                      </Badge>
                      
                      {editMode && (
                        <div className="ml-auto flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBlockId(editingBlockId === block.id ? null : block.id);
                            }}
                          >
                            {editingBlockId === block.id ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlock(block.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {editMode && editingBlockId === block.id ? (
                      <InlineBlockEdit
                        block={block}
                        onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
                      />
                    ) : (
                      <div className="space-y-2">
                        {!editMode && isExpanded ? (
                          lines.map((line, index) => {
                            const isLineActive = isBlockActive && currentLineIndex === index;
                            
                            return (
                              <div
                                key={index}
                                className={`
                                  p-3 rounded-xl cursor-pointer transition-all duration-200
                                  ${isLineActive
                                    ? "bg-live-active text-white ring-2 ring-live-active-border shadow-md"
                                    : isBlockActive 
                                      ? "bg-muted/50 hover:bg-muted"
                                      : "hover:bg-muted/50"
                                  }
                                `}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLineClick(block.id, index);
                                }}
                              >
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{line}</p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            <BlockDisplay block={block} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
            
            {editMode && (
              <Card className="p-4 border-dashed rounded-2xl">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm mb-3">Add New Block</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("point")}
                      className="justify-start"
                    >
                      Point
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("bible")}
                      className="justify-start"
                    >
                      Scripture
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("illustration")}
                      className="justify-start"
                    >
                      Illustration
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("application")}
                      className="justify-start"
                    >
                      Application
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("quote")}
                      className="justify-start"
                    >
                      Quote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("media")}
                      className="justify-start"
                    >
                      Media
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("custom")}
                      className="justify-start"
                    >
                      Custom
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock("reader_note")}
                      className="justify-start"
                    >
                      Reader Note
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
          </div>
          </ResizablePanel>
        
        {/* Audience View Preview - Fixed */}
        {showAudiencePreview && (
          <>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <div className="h-full p-6 overflow-hidden flex flex-col">
            <div className="space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Audience View</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${currentBlockId ? 'bg-live-active animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-xs text-muted-foreground">
                    {currentBlockId ? 'Broadcasting content' : 'Waiting for content'}
                  </span>
                </div>
              </div>
              
              <div 
                className="aspect-video rounded-2xl overflow-hidden shadow-xl border-2 border-border relative"
                style={backgroundStyle}
              >
                {settings.bgType === "image" && settings.bgImageDataUrl && (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40" />
                )}
                
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  {getCurrentContent() ? (
                    <div className="relative w-full max-w-6xl">
                      {/* Text backdrop - conditional based on settings */}
                      {settings.showTextBox && (
                        <div 
                          className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-3xl" 
                          style={{ margin: `-${settings.textBoxPadding * 0.25}rem` }}
                        />
                      )}
                      <div 
                        className="relative text-white font-bold leading-relaxed whitespace-pre-wrap"
                        style={{
                          fontSize: '10px',
                          textAlign: settings.align,
                          textTransform: settings.uppercase ? 'uppercase' : 'none',
                          color: settings.textColor,
                          padding: settings.showTextBox ? `${settings.textBoxPadding * 0.25}rem` : '0',
                          lineHeight: settings.lineHeight,
                          wordSpacing: `${settings.wordSpacing}px`,
                        }}
                      >
                        {getCurrentContent()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      {settings.showWaitingMessage && (
                        <div className="inline-block px-4 py-2 bg-black/30 backdrop-blur-sm rounded-xl">
                          <p className="text-xs text-white/70">
                            Waiting for LIVE
                          </p>
                          <p className="text-[8px] text-white/50 mt-1">
                            The presenter will display content here when ready
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                This is what your audience sees
              </div>
              
              {/* Large Timer Display */}
              <div className="mt-6">
                <PresenterTimer />
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white border-0"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Clear Live Display
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowEndLiveDialog(true)}
                  className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                >
                  <Power className="h-4 w-4 mr-2" />
                  End Live Session
                </Button>
              </div>
            </div>
            </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <PresentationSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={handleSettingsSave}
        currentSettings={settings}
      />

      <AlertDialog open={showEndLiveDialog} onOpenChange={setShowEndLiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Live Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the current live presentation and disconnect all viewers. 
              You'll be returned to the sermon editor where you can make further changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndLive}
              className="bg-destructive hover:bg-destructive/90"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
