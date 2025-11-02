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
import { Plus, GripVertical } from "lucide-react";

interface PagesListProps {
  pages: SermonPage[];
  blocks: SermonBlock[];
  onAddPage: () => void;
  onUpdatePage: (pageId: string, title: string) => void;
  onDeletePage: (pageId: string) => void;
}

export function PagesList({ pages, blocks, onAddPage, onUpdatePage, onDeletePage }: PagesListProps) {
  const getBlocksForPage = (pageId: string) => {
    return blocks.filter(block => block.pageId === pageId).sort((a, b) => a.order - b.order);
  };

  const unassignedBlocks = blocks.filter(block => !block.pageId).sort((a, b) => a.order - b.order);

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

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
          {unassignedBlocks.map((block, index) => (
            <div key={block.id}>
              <BlockItem block={block} />
              {index < unassignedBlocks.length - 1 && <InlineAddBlock afterBlockId={block.id} />}
            </div>
          ))}
        </div>
      )}

      {/* Pages accordion */}
      <Accordion type="multiple" defaultValue={sortedPages.map(p => p.id)} className="space-y-2">
        {sortedPages.map((page) => {
          const pageBlocks = getBlocksForPage(page.id);
          return (
            <AccordionItem 
              key={page.id} 
              value={page.id}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium text-sm">{page.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pageBlocks.length} {pageBlocks.length === 1 ? 'block' : 'blocks'})
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-2">
                  {pageBlocks.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No blocks in this page yet
                      <InlineAddBlock afterBlockId={undefined} pageId={page.id} />
                    </div>
                  ) : (
                    pageBlocks.map((block, index) => (
                      <div key={block.id}>
                        <BlockItem block={block} />
                        {index < pageBlocks.length - 1 && <InlineAddBlock afterBlockId={block.id} pageId={page.id} />}
                      </div>
                    ))
                  )}
                  {pageBlocks.length > 0 && <InlineAddBlock afterBlockId={pageBlocks[pageBlocks.length - 1].id} pageId={page.id} />}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Add Page Button */}
      <Button onClick={onAddPage} variant="outline" size="sm" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Page
      </Button>
    </div>
  );
}
