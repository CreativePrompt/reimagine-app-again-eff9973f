import { supabase } from "@/integrations/supabase/client";
import { SCRIPTURE_REGEX } from "./scriptureUtils";
import { parseReference } from "./scriptureNavigation";
import { getAllBooks } from "./bibleBooks";

/** Clean ESV API response into a single readable verse string. */
function cleanEsvText(raw: string): string {
  let t = raw || "";
  t = t.replace(/\(ESV\)/gi, "");
  t = t.replace(/\[\d+\]/g, "");
  t = t.replace(/\(\d+\)/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One ESV call for many references ("A; B; C"), retrying when throttled. */
async function requestPassages(refs: string[]): Promise<string[] | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("esv-bible", {
        body: { passage: refs.join("; "), includeVerseNumbers: true, includeHeadings: false },
      });
      if (error) throw error;
      return (data?.passages as string[]) || [];
    } catch (e) {
      console.warn("ESV request failed, retrying", e);
      await sleep(3000 + attempt * 3000); // ESV throttles bursts — back off
    }
  }
  return null;
}

/** Strip the leading "Book 1:2–3" line the API includes in each passage. */
function stripHeader(p: string): string {
  return p.replace(/^\s*[^\n]*\d[^\n]*\n+/, "");
}

function validatedPassage(ref: string, passage: string | undefined): string | null {
  if (!passage) return null;
  const expected = parseReference(ref.replace(/^(\d)\.\s*/, "$1 "));
  const actual = parseReference(passage.split("\n")[0]);
  if (!expected || !actual || expected.book !== actual.book || expected.chapter !== actual.chapter || expected.verse !== actual.verse) return null;
  return stripHeader(passage) || null;
}

/**
 * Fetch many references with as few API calls as possible (the ESV API throttles
 * bursts, which previously made some verses silently fail).
 */
async function fetchAll(refs: string[], out: Map<string, string | null>): Promise<void> {
  if (!refs.length) return;
  const passages = await requestPassages(refs.map((r) => r.replace(/^(\d)\.\s*/, "$1 ").replace(/[–—]/g, "-")));
  if (passages === null) {
    refs.forEach((r) => out.set(r, null));
    return;
  }
  if (passages && passages.length === refs.length) {
    refs.forEach((r, i) => out.set(r, validatedPassage(r, passages[i])));
    return;
  }
  if (refs.length === 1) {
    out.set(refs[0], validatedPassage(refs[0], passages?.[0]));
    return;
  }
  // Counts didn't line up (an unparseable reference) — split and retry
  const mid = Math.ceil(refs.length / 2);
  await fetchAll(refs.slice(0, mid), out);
  await fetchAll(refs.slice(mid), out);
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
const VERSION_RE = new RegExp(`^\\s*[,;]?\\s*(?:\\((?:${VERSIONS}|ESV)(?:\\s+version)?\\)|\\[(?:${VERSIONS}|ESV)(?:\\s+version)?\\]|(?:${VERSIONS}|ESV)(?:\\s+version)?\\b)`, "i");
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

/** Plain text markers survive Quill, saving, and switching between reading/editing. */
function markReference(doc: Document, block: HTMLElement, ref: string, converted: boolean) {
  const { tns, text } = textNodesOf(doc, block);
  const start = text.indexOf(ref);
  if (start < 0) return;
  const end = start + ref.length;
  const suffix = text.slice(end);
  const version = suffix.match(VERSION_RE)?.[0] || "";
  const question = suffix.slice(version.length).match(/^\s*\?/u)?.[0] || "";
  const replacement = converted
    ? ref + (version ? version.replace(new RegExp(`\\b(?:${VERSIONS}|ESV)(?:\\s+version)?\\b`, "i"), "ESV") : " (ESV)")
    : ref + version + " ?";
  const remaining = suffix.slice(version.length + question.length);
  const trailingSpace = !converted && remaining && !/^\s/.test(remaining) ? " " : "";
  replaceRange(tns, start, end + version.length + question.length, replacement + trailingSpace);
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
  const root = doc.getElementById("__root");
  if (!root) return { html, replaced: 0, failed: [] };
  let blocks = Array.from(root.querySelectorAll(BLOCK_SEL)) as HTMLElement[];
  // Only leaf-level blocks (avoid li containing p, etc.)
  blocks = blocks.filter((b) => !b.querySelector(BLOCK_SEL));
  if (!blocks.length) blocks = [root];

  // Gather references per block
  const refsByBlock = new Map<number, string[]>();
  const unclearByBlock = new Map<number, string[]>();
  blocks.forEach((b, i) => {
    const t = b.textContent || "";
    SCRIPTURE_REGEX.lastIndex = 0;
    const found: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = SCRIPTURE_REGEX.exec(t)) !== null) found.push(m[0]);
    SCRIPTURE_REGEX.lastIndex = 0;
    if (found.length) refsByBlock.set(i, found);
    // Unknown book abbreviations with an explicit chapter:verse are not guessed.
    const unclear: string[] = [];
    const candidate = /\b(?:[1-3]\. ?\s*)?[A-Za-z]{2,}\.?\s+\d{1,3}:\d{1,3}(?:\s*[-–—]\s*\d{1,3}(?::\d{1,3})?)?/g;
    let c: RegExpExecArray | null;
    while ((c = candidate.exec(t)) !== null) {
      if (!found.some((ref) => ref.includes(c?.[0] || ""))) unclear.push(c[0]);
    }
    if (unclear.length) unclearByBlock.set(i, unclear);
  });

  // Fetch all unique references (numbered form, so we can use per-verse text)
  const unique = Array.from(new Set(Array.from(refsByBlock.values()).flat()));
  const cache = new Map<string, string | null>();
  const valid = unique.filter((ref) => {
    const parsed = parseReference(ref);
    const book = parsed && getAllBooks().find((b) => b.name === parsed.book);
    return parsed && book && parsed.chapter > 0 && parsed.chapter <= book.chapters && parsed.verse > 0;
  });
  for (let i = 0; i < valid.length; i += 20) {
    await fetchAll(valid.slice(i, i + 20), cache);
  }
  const failed = new Set<string>();

  const used = new Set<HTMLElement>(); // blocks whose quote was already replaced
  const usedQuotes = new WeakMap<HTMLElement, Set<number>>();
  let replaced = 0;

  const tryQuoteIn = (b: HTMLElement, esv: string, opts: { after?: number; before?: number; fromEnd?: boolean } = {}) => {
    if (used.has(b)) return false;
    const { tns, text } = textNodesOf(doc, b);
    const span = findQuote(text, opts.after ?? 0, opts.before ?? text.length, opts.fromEnd);
    if (!span) return false;
    const taken = usedQuotes.get(b) || new Set<number>();
    if (taken.has(span[0])) return false;
    replaceRange(tns, span[0], span[1], esv);
    taken.add(span[0]);
    usedQuotes.set(b, taken);
    return true;
  };

  for (const [idx, refs] of refsByBlock) {
    const block = blocks[idx];
    for (const ref of refs) {
      const raw = cache.get(ref);
      if (!raw) {
        failed.add(ref);
        markReference(doc, block, ref, false);
        continue;
      }
      const verses = parseNumbered(raw);
      const esv = verses.size ? Array.from(verses.values()).join(" ") : cleanEsvText(raw);
      if (!esv) {
        failed.add(ref);
        markReference(doc, block, ref, false);
        continue;
      }

      const { text } = textNodesOf(doc, block);
      const refPos = text.indexOf(ref);
      let done = false;

      // Numbered verse lines are more specific than nearby quotations in commentary.
      if (verses.size) {
        const lines: { b: HTMLElement; tns: TN[]; start: number; end: number; verse: string }[] = [];
        for (let j = idx + 1; j < blocks.length; j++) {
          const b = blocks[j];
          const { tns, text: t } = textNodesOf(doc, b);
          const m = t.match(/^\s*(?:\[(\d{1,3})\]|(\d{1,3}))\s+/);
          if (!m || used.has(b)) break;
          const vt = verses.get(parseInt(m[1] || m[2], 10));
          if (!vt) break;
          lines.push({ b, tns, start: m[0].length, end: t.length, verse: vt });
        }
        // Do not claim a whole range was converted when only some lines matched.
        if (lines.length === verses.size) {
          lines.forEach(({ b, tns, start, end, verse }) => {
            replaceRange(tns, start, end, verse);
            used.add(b);
          });
          done = true;
        }
      }

      // 2a) Quote after the reference in the same block
      SCRIPTURE_REGEX.lastIndex = 0;
      const nextRef = Array.from(text.matchAll(SCRIPTURE_REGEX)).find((m) => (m.index ?? 0) > refPos);
      SCRIPTURE_REGEX.lastIndex = 0;
      if (!done && refPos >= 0) done = tryQuoteIn(block, esv, { after: refPos + ref.length, before: nextRef?.index ?? text.length });
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
      markReference(doc, block, ref, done);
      if (done) {
        replaced++;
      } else {
        failed.add(ref);
      }
    }
  }

  for (const [idx, refs] of unclearByBlock) {
    for (const ref of refs) {
      markReference(doc, blocks[idx], ref, false);
      failed.add(ref);
    }
  }

  return { html: root.innerHTML, replaced, failed: [...failed] };
}
