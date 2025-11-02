import { SermonBlock } from "@/lib/blockTypes";
import { BlockItem } from "./BlockItem";
import { InlineAddBlock } from "./InlineAddBlock";

interface BlockListProps {
  blocks: SermonBlock[];
}

export function BlockList({ blocks }: BlockListProps) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="mb-2">No blocks yet</p>
        <p className="text-sm">Click the "+ Add Block" button below to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 group/list">
      {blocks.map((block, index) => (
        <div key={block.id}>
          <BlockItem block={block} />
          {index < blocks.length - 1 && <InlineAddBlock afterBlockId={block.id} />}
        </div>
      ))}
    </div>
  );
}
