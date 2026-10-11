import { supabase } from "@/integrations/supabase/client";
import { SCRIPTURE_REGEX } from "./scriptureUtils";

/** Clean ESV API response into a single readable verse string. */
function cleanEsvText(raw: string): string {
  let t = raw || "";
  t = t.replace(/\(ESV\)/gi, "");
  t = t.replace(/\[\d+\]/g, "");
  t = t.replace(/\(\d+\)/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

async function fetchPassage(reference: string, withNumbers: boolean): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("esv-bible", {
        body: { passage: reference, includeVerseNumbers: withNumbers, includeHeadings: false },
      });
      if (error) throw error;
      const passages: string[] = data?.passages || [];
      if (!passages.length) return null;
      // Drop the leading "Book 1:2" reference line the API includes
      const canonical: string = data?.canonical || "";
      let p = passages.join(" ");
      if (canonical && p.startsWith(canonical)) p = p.slice(canonical.length);
      return p;
    } catch (e) {
      console.error("ESV fetch error", reference, e);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

/** Parse "[17] text [18] text" into verse-number → text. */
function parseNumbered(raw: string): Map<number, string> {
  const map = new Map<number, string>();
  const re = /\[(\d+)\]\s*([^[]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    map.set(parseInt(m[1], 10), cleanEsvText(m[2]));
  }
  return map;
}

export interface ConvertResult {
  html: string;
  replaced: number;
  failed: string[];
}

const VERSIONS = "KJV|NKJV|NIV|NASB|NLT|CSB|HCSB|RSV|NRSV|ASV|AMP|MSG|WEB|YLT|NET";
const VERSION_RE = new RegExp(`\\b(?:${VERSIONS})\\b`, "g");
const BLOCK_SEL = "p, li, blockquote, h1, h2, h3, h4, h5, h6, pre";
const isOpenQ = (c: string) => c === '"' || c === "\u201C";
const isCloseQ = (c: string) => c === '"' || c === "\u201D";

function hasRef(text: string): boolean {
  SCRIPTURE_REGEX.lastIndex = 0;
  const r = SCRIPTURE_REGEX.test(text);
  SCRIPTURE_REGEX.lastIndex = 0;
  return r;
}

type TN = { node: Text; start: number; end: number };
function textNodesOf(doc: Document, el: HTMLElement): { tns: TN[]; text: string } {
  const tns: TN[] = [];
  let text = "";
  const w = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Node | null = w.nextNode();
  while (n) {
    const v = (n as Text).nodeValue || "";
    tns.push({ node: n as Text, start: text.length, end: text.length + v.length });
    text += v;
    n = w.nextNode();
  }
  return { tns, text };
}

/** Replace [s, e) of the block's combined text with `replacement`, across text nodes. */
function replaceRange(tns: TN[], s: number, e: number, replacement: string) {
  let wrote = false;
  for (const tn of tns) {
    if (tn.end <= s || tn.start >= e) continue;
    const v = tn.node.nodeValue || "";
    const ls = Math.max(0, s - tn.start);
    const le = Math.min(v.length, e - tn.start);
    tn.node.nodeValue = wrote ? v.slice(0, ls) + v.slice(le) : v.slice(0, ls) + replacement + v.slice(le);
    wrote = true;
  }
  return wrote;
}

/** Find a quoted span "..." in `text` within [from, to). Returns inner range. */
function findQuote(text: string, from: number, to: number, fromEnd = false): [number, number] | null {
  const spans: [number, number][] = [];
  let i = from;
  while (i < to) {
    if (isOpenQ(text[i])) {
      let j = i + 1;
      while (j < to && !isCloseQ(text[j])) j++;
      if (j < to && j - i > 8) spans.push([i + 1, j]);
      i = j + 1;
    } else i++;
  }
  if (!spans.length) return null;
  return fromEnd ? spans[spans.length - 1] : spans[0];
}

/**
 * Convert every Scripture in the note to ESV, in place. Supports:
 *  - `Ref (KJV) "verse"` / `Ref KJV` then `"verse"` in a following block
 *  - `"verse"` then `— Ref KJV` in the following block (quote before reference)
 *  - `Ref KJV` heading followed by numbered verse lines (`17 text`, `18 text`)
 */
export async function convertNoteHtmlToEsv(html: string): Promise<ConvertResult> {
  if (!html || typeof window === "undefined") return { html, replaced: 0, failed: [] };

  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root")!;
  let blocks = Array.from(root.querySelectorAll(BLOCK_SEL)) as HTMLElement[];
  // Only leaf-level blocks (avoid li containing p, etc.)
  blocks = blocks.filter((b) => !b.querySelector(BLOCK_SEL));
  if (!blocks.length) blocks = [root];

  // Gather references per block
  const refsByBlock = new Map<number, string[]>();
  blocks.forEach((b, i) => {
    const t = b.textContent || "";
    SCRIPTURE_REGEX.lastIndex = 0;
    const found: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = SCRIPTURE_REGEX.exec(t)) !== null) found.push(m[0]);
    SCRIPTURE_REGEX.lastIndex = 0;
    if (found.length) refsByBlock.set(i, found);
  });
  if (!refsByBlock.size) return { html, replaced: 0, failed: [] };

  // Fetch all unique references (numbered form, so we can use per-verse text)
  const unique = Array.from(new Set(Array.from(refsByBlock.values()).flat()));
  const cache = new Map<string, string | null>();
  const failed: string[] = [];
  const queue = [...unique];
  await Promise.all(
    Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length) {
        const ref = queue.shift()!;
        const raw = await fetchPassage(ref.replace(/[–—]/g, "-"), true);
        cache.set(ref, raw);
        if (!raw) failed.push(ref);
      }
    })
  );

  const used = new Set<HTMLElement>(); // blocks whose quote was already replaced
  let replaced = 0;

  const tryQuoteIn = (b: HTMLElement, esv: string, opts: { after?: number; before?: number; fromEnd?: boolean } = {}) => {
    if (used.has(b)) return false;
    const { tns, text } = textNodesOf(doc, b);
    const span = findQuote(text, opts.after ?? 0, opts.before ?? text.length, opts.fromEnd);
    if (!span) return false;
    replaceRange(tns, span[0], span[1], esv);
    used.add(b);
    return true;
  };

  for (const [idx, refs] of refsByBlock) {
    const block = blocks[idx];
    for (const ref of refs) {
      const raw = cache.get(ref);
      if (!raw) continue;
      const verses = parseNumbered(raw);
      const esv = verses.size ? Array.from(verses.values()).join(" ") : cleanEsvText(raw);
      if (!esv) continue;

      // 1) Version tag in the reference block → ESV (text-node level; keeps DOM intact)
      for (const tn of textNodesOf(doc, block).tns) {
        const v = tn.node.nodeValue || "";
        const nv = v.replace(VERSION_RE, "ESV");
        if (nv !== v) tn.node.nodeValue = nv;
      }

      const { text } = textNodesOf(doc, block);
      const refPos = text.indexOf(ref);
      let done = false;

      // 2a) Quote after the reference in the same block
      if (refPos >= 0) done = tryQuoteIn(block, esv, { after: refPos + ref.length });
      // 2b) Quote in following blocks (until another reference)
      for (let j = idx + 1; !done && j < Math.min(blocks.length, idx + 4); j++) {
        if (hasRef(blocks[j].textContent || "")) break;
        done = tryQuoteIn(blocks[j], esv);
      }
      // 2c) Quote before the reference in the same block
      if (!done && refPos > 0) done = tryQuoteIn(block, esv, { before: refPos, fromEnd: true });
      // 2d) Quote in preceding blocks (citation-after-quote style)
      for (let j = idx - 1; !done && j >= Math.max(0, idx - 3); j--) {
        if (hasRef(blocks[j].textContent || "")) break;
        done = tryQuoteIn(blocks[j], esv, { fromEnd: true });
      }
      // 3) Numbered verse lines following the reference: "17 text"
      if (!done && verses.size) {
        let any = false;
        for (let j = idx + 1; j < blocks.length; j++) {
          const b = blocks[j];
          const { tns, text: t } = textNodesOf(doc, b);
          const m = t.match(/^\s*(\d{1,3})\s+/);
          if (!m) break;
          const vn = parseInt(m[1], 10);
          const vt = verses.get(vn);
          if (!vt) break;
          replaceRange(tns, m[0].length, t.length, vt);
          used.add(b);
          any = true;
        }
        done = any;
      }
      if (done) replaced++;
    }
  }

  return { html: root.innerHTML, replaced, failed };
}
