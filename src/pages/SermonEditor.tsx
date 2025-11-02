import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSermonStore } from "@/lib/store/sermonStore";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlockList } from "@/components/editor/BlockList";
import { DocumentView } from "@/components/editor/DocumentView";
import { AddBlockMenu } from "@/components/editor/AddBlockMenu";
import { PresentationSettingsDialog } from "@/components/editor/PresentationSettingsDialog";
import { LiveSessionDialog } from "@/components/editor/LiveSessionDialog";
import { Timer } from "@/components/editor/Timer";
import { BlockDisplay } from "@/components/editor/BlockDisplay";
import { Play, Save, ArrowLeft, Settings, LayoutGrid, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { reorderBlocks } from "@/lib/arrayUtils";
import { motion, AnimatePresence } from "framer-motion";

export default function SermonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentSermon, loadSermon, saveCurrentSermon, setCurrentSermon, reorderBlocks: reorderInStore } = useSermonStore();
  
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"block" | "document">("block");
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      loadSermon(id);
    }
  }, [id, user, loadSermon]);

  const handleSave = async () => {
    if (!currentSermon) return;
    
    setIsSaving(true);
    try {
      await saveCurrentSermon();
      toast.success("Sermon saved successfully");
    } catch (error) {
      toast.error("Failed to save sermon");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (title: string) => {
    if (currentSermon) {
      setCurrentSermon({ ...currentSermon, title });
    }
  };

  const handleSubtitleChange = (subtitle: string) => {
    if (currentSermon) {
      setCurrentSermon({ ...currentSermon, subtitle });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    if (currentSermon) {
      const reorderedBlocks = reorderBlocks(currentSermon.blocks, active.id as string, over.id as string);
      setCurrentSermon({ ...currentSermon, blocks: reorderedBlocks });
    }
  };

  if (authLoading || !user || !currentSermon) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">📖</div>
            <p className="text-muted-foreground">Loading sermon...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-end gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-md">
              <Button
                variant={viewMode === "block" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("block")}
                className="h-7 px-3 rounded-md text-xs"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                Block
              </Button>
              <Button
                variant={viewMode === "document" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("document")}
                className="h-7 px-3 rounded-md text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Document
              </Button>
            </div>

            {/* Zoom Controls - shown in preview mode */}
            {isPreviewMode && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="h-7 w-7 rounded-md"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs font-medium min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="h-7 w-7 rounded-md"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}

            <div className="h-4 w-px bg-border" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="h-7 px-3 hover:bg-accent transition-colors rounded-md text-xs"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Button>
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="h-7 px-3 hover:bg-accent transition-colors rounded-md text-xs"
            >
              {isPreviewMode ? "Exit Preview" : "Preview"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowLiveSession(true)}
              className="h-7 px-3 bg-primary hover:bg-primary/90 transition-all hover:shadow-md rounded-md text-xs"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Go Live
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 px-3 transition-all hover:shadow-md rounded-md text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? "Saving..." : "Save"}
            </Button>

            <div className="h-4 w-px bg-border" />

            <Timer />
          </div>
          
          {!isPreviewMode && (
            <div className="space-y-2 mt-4">
              <Input
                value={currentSermon.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Sermon Title"
                className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
              />
              <Textarea
                value={currentSermon.subtitle || ""}
                onChange={(e) => handleSubtitleChange(e.target.value)}
                placeholder="Add a subtitle or description..."
                className="border-0 px-0 resize-none focus-visible:ring-0 text-muted-foreground"
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Editor/Preview Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {isPreviewMode ? (
              /* Preview Mode */
              <motion.div
                key="preview-mode"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: 1, scale: zoom / 100 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.3,
                  scale: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
                }}
                className="h-full bg-background origin-top"
              >
                {viewMode === "block" ? (
                  <div className="max-w-5xl mx-auto px-6 py-8">
                    <div className="mb-8">
                      <h1 className="text-4xl font-bold mb-2">{currentSermon.title}</h1>
                      {currentSermon.subtitle && (
                        <p className="text-xl text-muted-foreground">{currentSermon.subtitle}</p>
                      )}
                    </div>
                    <div className="space-y-4">
                      {currentSermon.blocks.map((block) => (
                        <div 
                          key={block.id} 
                          className="animate-fade-in bg-gradient-to-br from-card to-card/80 rounded-2xl p-6 border border-accent/20"
                          style={{ boxShadow: 'var(--shadow-soft)' }}
                        >
                          <BlockDisplay block={block} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <DocumentView
                    title={currentSermon.title}
                    subtitle={currentSermon.subtitle}
                    blocks={currentSermon.blocks}
                    updatedAt={currentSermon.updatedAt}
                  />
                )}
              </motion.div>
            ) : (
              /* Edit Mode */
              <motion.div
                key="edit-mode"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 py-8 bg-gradient-to-b from-background to-background/95"
              >
                <AnimatePresence mode="wait">
                  {viewMode === "block" ? (
                    <motion.div
                      key="block-view"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="max-w-4xl mx-auto space-y-2"
                    >
                      <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={currentSermon.blocks.map(b => b.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <BlockList blocks={currentSermon.blocks} />
                        </SortableContext>
                      </DndContext>
                      
                      <AddBlockMenu />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="document-view"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <DocumentView
                        title={currentSermon.title}
                        subtitle={currentSermon.subtitle}
                        blocks={currentSermon.blocks}
                        updatedAt={currentSermon.updatedAt}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <PresentationSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
      
      <LiveSessionDialog
        open={showLiveSession}
        onOpenChange={setShowLiveSession}
        sermon={currentSermon}
      />
    </AppLayout>
  );
}
