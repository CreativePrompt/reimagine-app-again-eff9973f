import { SermonBlock, SermonPage } from "@/lib/blockTypes";
import { BlockItem } from "./BlockItem";
import { InlineAddBlock } from "./InlineAddBlock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, GripVertical, Edit2, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { DndContext, DragEndEvent, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

interface PagesListProps {
  pages: SermonPage[];
  blocks: SermonBlock[];
  onAddPage: () => void;
  onUpdatePage: (pageId: string, title: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (activeId: string, overId: string) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
}

interface SortablePageProps {
  page: SermonPage;
  blocks: SermonBlock[];
  onUpdatePage: (pageId: string, title: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
}

function SortablePage({ page, blocks, onUpdatePage, onDeletePage, onReorderBlocks }: SortablePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(page.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      onUpdatePage(page.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(page.title);
    setIsEditing(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderBlocks(active.id as string, over.id as string);
  };

  return (
    <>
      <AccordionItem 
        ref={setNodeRef}
        style={style}
        value={page.id}
        className="border rounded-lg bg-card"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline group">
          <div className="flex items-center gap-3 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Edit and Delete buttons on the left */}
            {!isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleSaveTitle}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium text-sm">{page.title}</span>
                <span className="text-xs text-muted-foreground">
                  ({blocks.length} {blocks.length === 1 ? 'block' : 'blocks'})
                </span>
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBlockDragEnd}
          >
            <SortableContext
              items={blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {blocks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No blocks in this page yet
                    <InlineAddBlock afterBlockId={undefined} pageId={page.id} />
                  </div>
                ) : (
                  blocks.map((block, index) => (
                    <div key={block.id}>
                      <BlockItem block={block} />
                      {index < blocks.length - 1 && <InlineAddBlock afterBlockId={block.id} pageId={page.id} />}
                    </div>
                  ))
                )}
                {blocks.length > 0 && <InlineAddBlock afterBlockId={blocks[blocks.length - 1].id} pageId={page.id} />}
              </div>
            </SortableContext>
          </DndContext>
        </AccordionContent>
      </AccordionItem>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{page.title}"? Blocks in this page will be moved to unorganized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeletePage(page.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PagesList({ pages, blocks, onAddPage, onUpdatePage, onDeletePage, onReorderPages, onReorderBlocks }: PagesListProps) {
  const getBlocksForPage = (pageId: string) => {
    return blocks.filter(block => block.pageId === pageId).sort((a, b) => a.order - b.order);
  };

  const unassignedBlocks = blocks.filter(block => !block.pageId).sort((a, b) => a.order - b.order);
  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderPages(active.id as string, over.id as string);
  };

  const handleUnassignedBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderBlocks(active.id as string, over.id as string);
  };

  if (pages.length === 0 && unassignedBlocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="mb-4">No pages yet</p>
        <Button onClick={onAddPage} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unassigned blocks section */}
      {unassignedBlocks.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-2">Unorganized Blocks</div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleUnassignedBlockDragEnd}
          >
            <SortableContext
              items={unassignedBlocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {unassignedBlocks.map((block, index) => (
                <div key={block.id}>
                  <BlockItem block={block} />
                  {index < unassignedBlocks.length - 1 && <InlineAddBlock afterBlockId={block.id} />}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Pages accordion with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handlePageDragEnd}
      >
        <SortableContext
          items={sortedPages.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="multiple" defaultValue={sortedPages.map(p => p.id)} className="space-y-2">
            {sortedPages.map((page) => {
              const pageBlocks = getBlocksForPage(page.id);
              return (
                <SortablePage
                  key={page.id}
                  page={page}
                  blocks={pageBlocks}
                  onUpdatePage={onUpdatePage}
                  onDeletePage={onDeletePage}
                  onReorderBlocks={onReorderBlocks}
                />
              );
            })}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Add Page Button */}
      <Button onClick={onAddPage} variant="outline" size="sm" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Page
      </Button>
    </div>
  );
}
