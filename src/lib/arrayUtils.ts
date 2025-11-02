import { SermonBlock } from "./blockTypes";

/**
 * Sorts an array of blocks by their order property
 */
export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * Reorders blocks after a drag and drop operation
 */
export function reorderBlocks(
  blocks: SermonBlock[],
  activeId: string,
  overId: string
): SermonBlock[] {
  const oldIndex = blocks.findIndex((b) => b.id === activeId);
  const newIndex = blocks.findIndex((b) => b.id === overId);

  if (oldIndex === -1 || newIndex === -1) return blocks;

  const reordered = [...blocks];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);

  // Update order properties
  return reordered.map((block, index) => ({
    ...block,
    order: index,
  }));
}
