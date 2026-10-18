import { findLastReference, cleanVerseText, type FetchedVerse } from './scriptureNavigation';

export interface NoteVerseTarget {
  reference: string;
  path: number[];
}

export function elementPath(root: HTMLElement, element: Element): number[] {
  const path: number[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) return [];
    path.unshift(Array.from(parent.children).indexOf(current));
    current = parent;
  }
  return path;
}

export function resolveVerseElement(root: HTMLElement, target: NoteVerseTarget): HTMLElement | null {
  let element: Element = root;
  for (const index of target.path) {
    const child = element.children[index];
    if (!child) return null;
    element = child;
  }
  return element === root ? null : element as HTMLElement;
}

const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre';
const hasQuote = (element: Element) => element.matches('blockquote') || Boolean(element.querySelector('em,i')) || /^[“"‘]/.test(element.textContent?.trim() ?? '');

/** A click on a citation or its adjacent quote targets only that local passage. */
export function findClickedVerse(root: HTMLElement, clicked: Element): NoteVerseTarget | null {
  const block = clicked.closest('blockquote') ?? clicked.closest(BLOCKS);
  if (!block || !root.contains(block)) return null;
  let citation: Element = block;
  let parsed = findLastReference(citation.textContent ?? '');
  if (!parsed && hasQuote(block)) {
    const before = block.previousElementSibling;
    const after = block.nextElementSibling;
    for (const neighbor of [before, after]) {
      if (!neighbor) continue;
      const reference = findLastReference(neighbor.textContent ?? '');
      if (reference) { citation = neighbor; parsed = reference; break; }
    }
  }
  if (!parsed) return null;
  let anchor: Element = citation;
  const following = citation.nextElementSibling;
  // Heading/reference followed by a quote: insert after the quote, not between them.
  if (following && !findLastReference(following.textContent ?? '') && hasQuote(following)) anchor = following;
  return { reference: `${parsed.book} ${parsed.chapter}:${parsed.verse}`, path: elementPath(root, anchor) };
}

export function makeNextVerseBlocks(anchor: HTMLElement, result: FetchedVerse): HTMLElement[] {
  const quote = document.createElement(anchor.matches('blockquote') ? 'blockquote' : 'p');
  // Reuse local inline formatting, never saved highlight/selection classes or links.
  const source = anchor.querySelector('em,i') ?? anchor;
  const italic = document.createElement('em');
  if (source.getAttribute('style')) italic.setAttribute('style', source.getAttribute('style') ?? '');
  const text = cleanVerseText(result.text);
  italic.textContent = /^[“"]/.test(text) ? text : `“${text}”`;
  quote.appendChild(italic);
  const citation = document.createElement('p');
  const label = document.createElement('em');
  label.textContent = `— ${result.reference} ESV`;
  citation.appendChild(label);
  return [quote, citation];
}