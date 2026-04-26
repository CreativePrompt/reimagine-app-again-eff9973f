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
  // Quoted block: handles straight and curly quotes, possibly multi-line
  const QUOTE_RE = /([""\u201C\u201D"])([\s\S]*?)([""\u201C\u201D"])/;

  let replaced = 0;

  // Process refs in DOM order. Group by container element so we can replace
  // the quote that follows the reference in that block.
  for (const { reference, node } of refMatches) {
    const esvText = esvMap.get(reference);
    if (!esvText) continue;

    // Walk up to the nearest block element to scope the search
    const block =
      (node.parentElement?.closest(
        "p, li, blockquote, div, h1, h2, h3, h4, h5, h6"
      ) as HTMLElement) || node.parentElement;
    if (!block) continue;

    // 1) Replace version tag in block (KJV/NIV/etc.) → (ESV)
    const innerHtml = block.innerHTML;
    let newHtml = innerHtml.replace(VERSION_TAG_RE, "(ESV)");

    // 2) Replace the first quoted text after the reference within this block.
    // We work in textContent space then map back via simple string replace
    // on innerHTML — this is approximate but works for typical note formatting.
    const blockText = block.textContent || "";
    const refIdx = blockText.indexOf(reference);
    if (refIdx >= 0) {
      const after = blockText.slice(refIdx + reference.length);
      const qm = after.match(QUOTE_RE);
      if (qm && qm[2]) {
        const originalQuoted = qm[2];
        // Escape for use in string replace (only need to escape special chars
        // that could appear in HTML attributes — we use plain string replace).
        if (originalQuoted.trim().length > 0) {
          // Replace the first occurrence of the quoted text in the innerHTML
          const idx = newHtml.indexOf(originalQuoted);
          if (idx >= 0) {
            newHtml =
              newHtml.slice(0, idx) +
              esvText +
              newHtml.slice(idx + originalQuoted.length);
            replaced++;
          }
        }
      } else {
        // No quoted text — still count the version-tag swap as a replacement
        if (newHtml !== innerHtml) replaced++;
      }
    }

    if (newHtml !== innerHtml) {
      block.innerHTML = newHtml;
    }
  }

  return { html: root.innerHTML, replaced, failed };
}
