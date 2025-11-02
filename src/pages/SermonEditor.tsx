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
import { PreviewDialog } from "@/components/editor/PreviewDialog";
import { PresentationSettingsDialog } from "@/components/editor/PresentationSettingsDialog";
import { LiveSessionDialog } from "@/components/editor/LiveSessionDialog";
import { Timer } from "@/components/editor/Timer";
import { Eye, Play, Save, ArrowLeft, Settings, LayoutGrid, FileText } from "lucide-react";
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
  
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"block" | "document">("block");

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
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <Button
                  variant={viewMode === "block" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("block")}
                  className="h-8"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Block
                </Button>
                <Button
                  variant={viewMode === "document" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("document")}
                  className="h-8"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Document
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="hover:bg-accent transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowLiveSession(true)}
                className="bg-primary hover:bg-primary/90 transition-all hover:shadow-lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Go Live
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="transition-all hover:shadow-lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>

              <div className="h-6 w-px bg-border" />

              <Timer />
            </div>
          </div>
          
          <div className="space-y-2">
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
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto px-6 py-8 bg-gradient-to-b from-background to-background/95">
          <AnimatePresence mode="wait">
            {viewMode === "block" ? (
              <motion.div
                key="block-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto space-y-4"
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
        </div>
      </div>

      <PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        sermon={currentSermon}
      />
      
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
