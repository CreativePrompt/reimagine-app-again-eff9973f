import { supabase } from "@/integrations/supabase/client";
import { SCRIPTURE_REGEX } from "./scriptureUtils";

/**
 * Clean ESV API response into a single readable verse string.
 * Strips passage header, verse-number brackets, footnote markers, and (ESV) tag.
 */
function cleanEsvText(raw: string): string {
  let t = raw || "";
  // Remove leading passage header line(s) like "Romans 2:4\n\n"
  t = t.replace(/^[^\n]*\n+/, (m) => (/[.""']/.test(m) ? m : ""));
  t = t.replace(/\(ESV\)/gi, "");
  t = t.replace(/\[\d+\]/g, ""); // verse number brackets
  t = t.replace(/\(\d+\)/g, ""); // footnote markers
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

async function fetchEsv(reference: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("esv-bible", {
      body: {
        passage: reference,
        includeVerseNumbers: false,
        includeHeadings: false,
      },
    });
    if (error) {
      console.error("ESV fetch error", reference, error);
      return null;
    }
    const passages: string[] = data?.passages || [];
    if (!passages.length) return null;
    return cleanEsvText(passages[0]);
  } catch (e) {
    console.error("ESV fetch exception", reference, e);
    return null;
  }
}

export interface ConvertResult {
  html: string;
  replaced: number;
  failed: string[];
}

/**
 * Walk HTML content, find scripture references, fetch their ESV text,
 * and replace the quoted verse text + version tag in-place.
 *
 * Replacement strategy (per text node containing a reference):
 *   - Find the scripture reference (e.g. "Romans 2:4")
 *   - Replace any "(KJV)", "(NIV)", "(NASB)", "(NKJV)" version tag near it with "(ESV)"
 *   - Replace the quoted text that follows on the same or next text node
 *     with the ESV text.
 */
export async function convertNoteHtmlToEsv(html: string): Promise<ConvertResult> {
  if (!html || typeof window === "undefined") {
    return { html, replaced: 0, failed: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root")!;

  // Collect references with the text node they live in
  const refMatches: Array<{ reference: string; node: Text; index: number }> = [];

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const text = textNode.nodeValue || "";
    SCRIPTURE_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SCRIPTURE_REGEX.exec(text)) !== null) {
      refMatches.push({ reference: m[0], node: textNode, index: m.index });
    }
    node = walker.nextNode();
  }

  if (!refMatches.length) {
    return { html, replaced: 0, failed: [] };
  }

  // Dedupe references for fetching
  const unique = Array.from(new Set(refMatches.map((r) => r.reference)));
  const esvMap = new Map<string, string>();
  const failed: string[] = [];

  await Promise.all(
    unique.map(async (ref) => {
      const text = await fetchEsv(ref);
      if (text) esvMap.set(ref, text);
      else failed.push(ref);
    })
  );

  const VERSION_TAG_RE = /\((?:KJV|NIV|NASB|NKJV|ESV|NLT|CSB|HCSB|RSV|ASV|AMP|MSG|WEB|YLT)\)/gi;
  const OPEN_QUOTES = ['"', "\u201C", "\u201D", "\u2018", "\u2019", "'"];
  const CLOSE_QUOTES = ['"', "\u201C", "\u201D", "\u2018", "\u2019", "'"];

  const isOpen = (ch: string) => OPEN_QUOTES.includes(ch);
  const isClose = (ch: string) => CLOSE_QUOTES.includes(ch);

  let replaced = 0;
  const processedBlocks = new Set<HTMLElement>();

  for (const { reference, node } of refMatches) {
    const esvText = esvMap.get(reference);
    if (!esvText) continue;

    const block =
      (node.parentElement?.closest(
        "p, li, blockquote, div, h1, h2, h3, h4, h5, h6"
      ) as HTMLElement) || node.parentElement;
    if (!block) continue;

    // 1) Always replace version tag(s) in this block
    if (!processedBlocks.has(block)) {
      const before = block.innerHTML;
      const after = before.replace(VERSION_TAG_RE, "(ESV)");
      if (after !== before) block.innerHTML = after;
      processedBlocks.add(block);
    }

    // 2) Find the next sibling block(s) that contain the quoted scripture text.
    // Scripture is often: <p>Reference (KJV)</p><p>"verse text..."</p>
    // Search the reference's block first, then following siblings, for an
    // opening quote and a closing quote — and replace the text between them
    // (across text nodes) with the ESV text.
    const candidates: HTMLElement[] = [block];
    let sib = block.nextElementSibling as HTMLElement | null;
    let hops = 0;
    while (sib && hops < 6) {
      candidates.push(sib);
      // Stop scanning once we hit another scripture reference
      if (SCRIPTURE_REGEX.test(sib.textContent || "")) break;
      sib = sib.nextElementSibling as HTMLElement | null;
      hops++;
    }

    // Collect all text nodes across candidates with running offsets
    type TN = { node: Text; start: number; end: number; el: HTMLElement };
    const tns: TN[] = [];
    let combined = "";
    for (const el of candidates) {
      const w = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n: Node | null = w.nextNode();
      while (n) {
        const t = n as Text;
        const v = t.nodeValue || "";
        tns.push({ node: t, start: combined.length, end: combined.length + v.length, el });
        combined += v;
        n = w.nextNode();
      }
      // separator between blocks so we don't accidentally merge words
      combined += "\n";
    }

    // Find reference position in combined
    const refPos = combined.indexOf(reference);
    if (refPos < 0) continue;
    const searchFrom = refPos + reference.length;

    // Find opening quote after the reference
    let openIdx = -1;
    for (let i = searchFrom; i < combined.length; i++) {
      if (isOpen(combined[i])) { openIdx = i; break; }
      // Stop if we hit another scripture reference
    }
    if (openIdx < 0) continue;

    // Find closing quote
    let closeIdx = -1;
    for (let i = openIdx + 1; i < combined.length; i++) {
      if (isClose(combined[i])) { closeIdx = i; break; }
    }
    if (closeIdx < 0) continue;

    const innerStart = openIdx + 1;
    const innerEnd = closeIdx;
    if (innerEnd <= innerStart) continue;

    // Replace text between innerStart and innerEnd across text nodes
    let wrote = false;
    for (const tn of tns) {
      if (tn.end <= innerStart || tn.start >= innerEnd) continue;
      const localStart = Math.max(0, innerStart - tn.start);
      const localEnd = Math.min(tn.node.nodeValue?.length || 0, innerEnd - tn.start);
      const v = tn.node.nodeValue || "";
      if (!wrote) {
        tn.node.nodeValue = v.slice(0, localStart) + esvText + v.slice(localEnd);
        wrote = true;
      } else {
        tn.node.nodeValue = v.slice(0, localStart) + v.slice(localEnd);
      }
    }
    if (wrote) replaced++;
  }

  return { html: root.innerHTML, replaced, failed };
}
