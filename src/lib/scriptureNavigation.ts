import { BIBLE_BOOKS } from "./bibleBooks";
import { findScriptureReferences, SCRIPTURE_REGEX } from "./scriptureUtils";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedReference {
  book: string;      // Canonical book name
  chapter: number;
  verse: number;
  raw: string;       // Raw matched text
  matchIndex: number; // Index in source text
  matchEnd: number;
}

const ALL_BOOKS = [
  ...BIBLE_BOOKS["Old Testament"],
  ...BIBLE_BOOKS["New Testament"],
];

// Map of lowercased book name/abbr to canonical name + chapter count
const BOOK_LOOKUP: Record<string, { name: string; chapters: number }> = (() => {
  const map: Record<string, { name: string; chapters: number }> = {};
  const aliases: Record<string, string> = {
    // Common aliases that aren't the exact "abbr" field
    "gen": "Genesis", "ex": "Exodus", "exo": "Exodus", "exod": "Exodus",
    "lev": "Leviticus", "num": "Numbers", "deut": "Deuteronomy", "dt": "Deuteronomy",
    "josh": "Joshua", "judg": "Judges", "jdg": "Judges", "rth": "Ruth",
    "1 sam": "1 Samuel", "2 sam": "2 Samuel", "1sam": "1 Samuel", "2sam": "2 Samuel",
    "1 kgs": "1 Kings", "2 kgs": "2 Kings", "1kgs": "1 Kings", "2kgs": "2 Kings",
    "1 chr": "1 Chronicles", "2 chr": "2 Chronicles",
    "ezr": "Ezra", "neh": "Nehemiah", "est": "Esther", "esth": "Esther",
    "ps": "Psalms", "psa": "Psalms", "psalm": "Psalms",
    "prov": "Proverbs", "prv": "Proverbs", "ecc": "Ecclesiastes", "eccl": "Ecclesiastes",
    "song": "Song of Solomon", "sos": "Song of Solomon", "ss": "Song of Solomon",
    "isa": "Isaiah", "is": "Isaiah", "jer": "Jeremiah", "lam": "Lamentations",
    "ezek": "Ezekiel", "eze": "Ezekiel", "dan": "Daniel",
    "hos": "Hosea", "am": "Amos", "obad": "Obadiah", "ob": "Obadiah",
    "jon": "Jonah", "mic": "Micah", "nah": "Nahum", "hab": "Habakkuk",
    "zeph": "Zephaniah", "zep": "Zephaniah", "hag": "Haggai",
    "zech": "Zechariah", "zec": "Zechariah", "mal": "Malachi",
    "matt": "Matthew", "mt": "Matthew", "mk": "Mark", "lk": "Luke", "jn": "John",
    "rom": "Romans", "rm": "Romans",
    "1 cor": "1 Corinthians", "2 cor": "2 Corinthians",
    "gal": "Galatians", "eph": "Ephesians", "phil": "Philippians", "php": "Philippians",
    "col": "Colossians",
    "1 thess": "1 Thessalonians", "2 thess": "2 Thessalonians",
    "1 th": "1 Thessalonians", "2 th": "2 Thessalonians",
    "1 tim": "1 Timothy", "2 tim": "2 Timothy",
    "tit": "Titus", "phlm": "Philemon", "phm": "Philemon",
    "heb": "Hebrews", "jas": "James", "jam": "James",
    "1 pet": "1 Peter", "2 pet": "2 Peter", "1 pt": "1 Peter", "2 pt": "2 Peter",
    "1 jn": "1 John", "2 jn": "2 John", "3 jn": "3 John",
    "rev": "Revelation", "rv": "Revelation",
  };

  const add = (key: string, canonical: string) => {
    const book = ALL_BOOKS.find(b => b.name === canonical);
    if (book) map[key.toLowerCase().replace(/\s+/g, " ").trim()] = { name: book.name, chapters: book.chapters };
  };

  ALL_BOOKS.forEach(b => {
    add(b.name, b.name);
    add(b.abbr, b.name);
  });
  Object.entries(aliases).forEach(([k, v]) => add(k, v));
  return map;
})();

function normalizeBookKey(raw: string): string {
  return raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

/**
 * Parse a book+chapter+verse reference string into structured data.
 * If no verse is provided, treats it as verse 1.
 */
export function parseReference(raw: string): ParsedReference | null {
  SCRIPTURE_REGEX.lastIndex = 0;
  const m = SCRIPTURE_REGEX.exec(raw);
  if (!m) return null;
  const bookRaw = m[1];
  const chapter = parseInt(m[2], 10);
  const verse = m[3] ? parseInt(m[3], 10) : 1;
  const endVerse = m[4] ? parseInt(m[4].split(":").pop() || "0", 10) : verse;

  const key = normalizeBookKey(bookRaw);
  const bookInfo = BOOK_LOOKUP[key];
  if (!bookInfo) return null;

  return {
    book: bookInfo.name,
    chapter,
    verse: endVerse || verse,
    raw: m[0],
    matchIndex: 0,
    matchEnd: m[0].length,
  };
}

/**
 * Find the LAST scripture reference in a block of text.
 */
export function findLastReference(text: string): ParsedReference | null {
  const matches = findScriptureReferences(text);
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const parsed = parseReference(last.reference);
  if (!parsed) return null;
  parsed.matchIndex = last.start;
  parsed.matchEnd = last.end;
  // If the matched reference had a range end, parseReference already resolved to endVerse.
  return parsed;
}

/**
 * Compute the next verse reference candidates: primary (same chapter, verse+1)
 * and fallback (next chapter verse 1). Returns null when past end of book.
 */
export function getNextVerseCandidates(ref: ParsedReference): { primary: string; fallback: string | null } {
  const bookInfo = BOOK_LOOKUP[normalizeBookKey(ref.book)];
  const primary = `${ref.book} ${ref.chapter}:${ref.verse + 1}`;
  if (bookInfo && ref.chapter < bookInfo.chapters) {
    return { primary, fallback: `${ref.book} ${ref.chapter + 1}:1` };
  }
  return { primary, fallback: null };
}

export interface FetchedVerse {
  reference: string; // Canonical from ESV
  text: string;
}

async function fetchEsvPassage(passage: string): Promise<FetchedVerse | null> {
  const { data, error } = await supabase.functions.invoke("esv-bible", {
    body: { passage, includeVerseNumbers: false, includeHeadings: false },
  });
  if (error) throw error;
  if (!data?.passages || data.passages.length === 0) return null;
  const text = String(data.passages[0]).trim();
  if (!text) return null;
  return { reference: data.canonical || passage, text };
}

/**
 * Fetch the next verse after the last reference in `documentText`.
 * Tries same-chapter next verse, then rolls over to next chapter, then next book if needed
 * (next-book rollover is not implemented — ESV canonical will simply be empty).
 */
export async function fetchNextVerse(documentText: string): Promise<FetchedVerse | null> {
  const last = findLastReference(documentText);
  if (!last) throw new Error("NO_REFERENCE");

  const { primary, fallback } = getNextVerseCandidates(last);
  const primaryResult = await fetchEsvPassage(primary);
  if (primaryResult) return primaryResult;

  if (fallback) {
    const fallbackResult = await fetchEsvPassage(fallback);
    if (fallbackResult) return fallbackResult;
  }

  return null;
}

/**
 * Clean ESV passage text into a single, quotable line.
 */
export function cleanVerseText(text: string): string {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\[\d+\]\s*/g, "")
    .replace(/^\s+|\s+$/g, "")
    .trim();
}
