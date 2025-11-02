import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSermonStore } from "@/lib/store/sermonStore";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlockList } from "@/components/editor/BlockList";
import { AddBlockMenu } from "@/components/editor/AddBlockMenu";
import { PreviewDialog } from "@/components/editor/PreviewDialog";
import { PresentationSettingsDialog } from "@/components/editor/PresentationSettingsDialog";
import { LiveSessionDialog } from "@/components/editor/LiveSessionDialog";
import { Eye, Play, Save, ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { reorderBlocks } from "@/lib/arrayUtils";

export default function SermonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentSermon, loadSermon, saveCurrentSermon, setCurrentSermon, reorderBlocks: reorderInStore } = useSermonStore();
  
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowLiveSession(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                Go Live
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
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
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
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
          </div>
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
