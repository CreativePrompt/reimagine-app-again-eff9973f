import { SermonBlock } from "@/lib/blockTypes";
import { BlockItem } from "./BlockItem";

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
    <div className="space-y-3">
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </div>
  );
}
