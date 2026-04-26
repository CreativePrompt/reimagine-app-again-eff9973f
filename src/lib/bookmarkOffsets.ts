// Utilities for resolving bookmark positions inside rendered note content.

/** Compute the character offset (within plain text of `root`) at the given DOM node + offset. */
export function computeTextOffset(root: HTMLElement, node: Node, nodeOffset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n === node) {
      return total + Math.min(nodeOffset, (n as Text).nodeValue?.length || 0);
    }
    // If the target is inside an element node (not a text node), check containment
    if (node.nodeType === 1 && (node as HTMLElement).contains(n)) {
      // first text inside the target — return current total
      return total;
    }
    total += (n as Text).nodeValue?.length || 0;
    n = walker.nextNode();
  }
  return total;
}

/** Find the element containing the character at `offset` within `root`'s plain text. */
export function findElementByTextOffset(root: HTMLElement, offset: number): HTMLElement | null {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    const len = (n as Text).nodeValue?.length || 0;
    if (offset <= total + len) {
      const el = (n.parentElement as HTMLElement) || null;
      return el;
    }
    total += len;
    n = walker.nextNode();
  }
  // Fallback: return last element
  const last = root.lastElementChild as HTMLElement | null;
  return last;
}

/** Find an element whose text contains the snippet (case-insensitive, whitespace-normalized). */
export function findTextInElement(root: HTMLElement, snippet: string): HTMLElement | null {
  const needle = snippet.replace(/\s+/g, " ").trim().toLowerCase();
  if (!needle) return null;
  const blocks = Array.from(
    root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div")
  ) as HTMLElement[];
  for (const b of blocks) {
    const text = (b.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text.includes(needle)) return b;
  }
  // Fallback: scan text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    const text = ((n as Text).nodeValue || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text.includes(needle)) return (n.parentElement as HTMLElement) || null;
    n = walker.nextNode();
  }
  return null;
}
