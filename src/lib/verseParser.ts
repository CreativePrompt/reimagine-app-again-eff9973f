import { extractScriptureReferences, SCRIPTURE_REGEX } from "./scriptureUtils";

export interface ParsedVerse {
  verseNumber: number;
  text: string;
}

export interface ParsedScripture {
  reference: string;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number | null;
  verses: ParsedVerse[];
  fullText: string;
}

/**
 * Parse a scripture text to extract individual verses
 * Looks for verse patterns like:
 * - "1 In the beginning..." (number at start of sentence)
 * - "[1] In the beginning..." (bracketed number)
 * - "v.1 In the beginning..." (v. prefix)
 * - Just numbered sentences in the text
 */
export function parseVersesFromText(text: string): ParsedVerse[] {
  const verses: ParsedVerse[] = [];
  
  // Pattern to match verse numbers in various formats:
  // 1) "[1]" - bracketed
  // 2) "v. 1" or "v.1" - with v prefix
  // 3) "1 " at start or after period/quote - standalone number followed by space
  const versePattern = /(?:\[(\d+)\]|v\.?\s*(\d+)|(?:^|[.""']\s*)(\d+)(?=\s+[A-Z]))/g;
  
  let match;
  const verseMatches: { verseNumber: number; start: number }[] = [];
  
  // First pass: find all verse markers
  while ((match = versePattern.exec(text)) !== null) {
    const verseNumber = parseInt(match[1] || match[2] || match[3], 10);
    if (verseNumber && verseNumber > 0 && verseNumber < 200) {
      verseMatches.push({
        verseNumber,
        start: match.index,
      });
    }
  }
  
  // If no verse markers found, try to split by sentences as fallback
  if (verseMatches.length === 0) {
    // Try splitting by sentences for a basic breakdown
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    sentences.forEach((sentence, index) => {
      verses.push({
        verseNumber: index + 1,
        text: sentence.trim(),
      });
    });
    return verses;
  }
  
  // Sort by verse number to handle out-of-order matches
  verseMatches.sort((a, b) => a.start - b.start);
  
  // Second pass: extract verse text
  for (let i = 0; i < verseMatches.length; i++) {
    const current = verseMatches[i];
    const next = verseMatches[i + 1];
    
    const start = current.start;
    const end = next ? next.start : text.length;
    
    let verseText = text.slice(start, end).trim();
    
    // Clean up the verse text - remove the verse number marker
    verseText = verseText
      .replace(/^\[\d+\]\s*/, '')
      .replace(/^v\.?\s*\d+\s*/i, '')
      .replace(/^\d+\s+/, '')
      .trim();
    
    if (verseText) {
      verses.push({
        verseNumber: current.verseNumber,
        text: verseText,
      });
    }
  }
  
  return verses;
}

/**
 * Extract scripture reference from highlighted text
 * Returns the reference (e.g., "John 3:1-7") and the parsed verses
 */
export function parseScriptureFromHighlight(text: string): ParsedScripture | null {
  // Try to find a scripture reference in the text
  const references = extractScriptureReferences(text);
  
  if (references.length === 0) {
    // No reference found, but might still be verse text
    // Check if text starts with "Text: " or similar patterns
    const textMatch = text.match(/^(?:Text:\s*)?([A-Za-z0-9]+\s+\d+(?::\d+(?:\s*[-–—]\s*\d+)?)?)\s*[-–—]\s*/i);
    if (textMatch) {
      const ref = textMatch[1];
      const restOfText = text.slice(textMatch[0].length);
      const verses = parseVersesFromText(restOfText);
      
      // Parse the reference
      const refMatch = ref.match(/([A-Za-z0-9]+)\s+(\d+)(?::(\d+)(?:\s*[-–—]\s*(\d+))?)?/);
      if (refMatch) {
        return {
          reference: ref,
          book: refMatch[1],
          chapter: parseInt(refMatch[2], 10),
          startVerse: refMatch[3] ? parseInt(refMatch[3], 10) : 1,
          endVerse: refMatch[4] ? parseInt(refMatch[4], 10) : null,
          verses,
          fullText: restOfText,
        };
      }
    }
    return null;
  }
  
  const reference = references[0];
  
  // Parse the reference to get book, chapter, verses
  SCRIPTURE_REGEX.lastIndex = 0;
  const match = SCRIPTURE_REGEX.exec(reference);
  
  if (!match) return null;
  
  const book = match[1];
  const chapter = parseInt(match[2], 10);
  const startVerse = match[3] ? parseInt(match[3], 10) : 1;
  const endVerse = match[4] ? parseInt(match[4], 10) : null;
  
  // Find where the reference ends in the text and get the verse content
  const refIndex = text.indexOf(reference);
  let verseContent = text;
  
  if (refIndex >= 0) {
    // Remove the reference prefix (e.g., "Text: John 3:1-7 — ")
    const afterRef = text.slice(refIndex + reference.length);
    // Remove leading dashes, quotes, etc.
    verseContent = afterRef.replace(/^\s*[-–—:]\s*["']?\s*/, '').replace(/["']?\s*\(ESV\)\s*$/, '');
  }
  
  // Parse the verse content into individual verses
  const verses = parseVersesFromText(verseContent);
  
  // If we couldn't parse verses but have content, create a single verse
  if (verses.length === 0 && verseContent.trim()) {
    verses.push({
      verseNumber: startVerse,
      text: verseContent.trim(),
    });
  }
  
  return {
    reference,
    book,
    chapter,
    startVerse,
    endVerse,
    verses,
    fullText: verseContent,
  };
}

/**
 * Format a verse display with verse number
 */
export function formatVerseDisplay(verse: ParsedVerse): string {
  return `${verse.verseNumber} ${verse.text}`;
}

/**
 * Get a group of verses for pagination
 */
export function getVerseGroup(verses: ParsedVerse[], pageIndex: number, versesPerPage: number): ParsedVerse[] {
  const start = pageIndex * versesPerPage;
  const end = start + versesPerPage;
  return verses.slice(start, end);
}

/**
 * Calculate total pages
 */
export function getTotalPages(totalVerses: number, versesPerPage: number): number {
  return Math.ceil(totalVerses / versesPerPage);
}
