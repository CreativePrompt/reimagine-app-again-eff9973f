import { BIBLE_BOOKS } from "./bibleBooks";

// Get all book names and abbreviations for regex
const getAllBookPatterns = () => {
  const books = [
    ...BIBLE_BOOKS["Old Testament"],
    ...BIBLE_BOOKS["New Testament"],
  ];
  
  // Create patterns for full names and abbreviations
  const patterns: string[] = [];
  books.forEach(book => {
    // Full name (escape special regex chars)
    patterns.push(book.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Abbreviation
    patterns.push(book.abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Common variations
    if (book.name.includes(' ')) {
      // Allow period after number for books like "1. Samuel"
      const withPeriod = book.name.replace(/^(\d)\s/, '$1\\.?\\s*');
      patterns.push(withPeriod);
    }
  });
  
  // Add common abbreviation patterns
  const commonAbbreviations = [
    'Gen', 'Ex', 'Exo', 'Lev', 'Num', 'Deut', 'Dt',
    'Josh', 'Judg', 'Jdg', 'Rth', 'Ruth',
    '1\\s*Sam', '2\\s*Sam', '1\\s*Kgs', '2\\s*Kgs',
    '1\\s*Chr', '2\\s*Chr', 'Ezr', 'Neh', 'Est', 'Esth',
    'Ps', 'Psa', 'Psalm', 'Psalms', 'Prov', 'Prv', 'Ecc', 'Eccl',
    'Song', 'SS', 'SoS', 'Isa', 'Is', 'Jer', 'Lam',
    'Ezek', 'Eze', 'Dan', 'Hos', 'Joel', 'Amos', 'Am',
    'Obad', 'Ob', 'Jon', 'Jonah', 'Mic', 'Nah', 'Hab',
    'Zeph', 'Zep', 'Hag', 'Zech', 'Zec', 'Mal',
    'Matt', 'Mt', 'Mk', 'Mark', 'Lk', 'Luke', 'Jn', 'John',
    'Acts', 'Rom', 'Rm',
    '1\\s*Cor', '2\\s*Cor', 'Gal', 'Eph', 'Phil', 'Php',
    'Col', '1\\s*Thess', '2\\s*Thess', '1\\s*Th', '2\\s*Th',
    '1\\s*Tim', '2\\s*Tim', 'Tit', 'Titus', 'Phlm', 'Phm', 'Philemon',
    'Heb', 'Jas', 'Jam', 'James',
    '1\\s*Pet', '2\\s*Pet', '1\\s*Pt', '2\\s*Pt',
    '1\\s*Jn', '2\\s*Jn', '3\\s*Jn', '1\\s*John', '2\\s*John', '3\\s*John',
    'Jude', 'Rev', 'Rv', 'Revelation'
  ];
  
  patterns.push(...commonAbbreviations);
  
  return patterns;
};

// Build the scripture reference regex
const buildScriptureRegex = () => {
  const bookPatterns = getAllBookPatterns();
  const bookGroup = `(?:${bookPatterns.join('|')})`;
  
  // Pattern for chapter:verse references
  // Matches: John 3:16, Matthew 1:22-23, 1 John 1:1-2:2, Rom. 8:28, Ps 23:1-6
  // Also matches ranges like John 3:16-18, Matthew 5:1-7:29
  const pattern = new RegExp(
    `\\b(${bookGroup})\\.?\\s*(\\d{1,3})(?::(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}(?::\\d{1,3})?))?)?\\b`,
    'gi'
  );
  
  return pattern;
};

export const SCRIPTURE_REGEX = buildScriptureRegex();

/**
 * Check if a string contains a scripture reference
 */
export const containsScriptureReference = (text: string): boolean => {
  SCRIPTURE_REGEX.lastIndex = 0;
  return SCRIPTURE_REGEX.test(text);
};

/**
 * Extract all scripture references from text
 */
export const extractScriptureReferences = (text: string): string[] => {
  const references: string[] = [];
  SCRIPTURE_REGEX.lastIndex = 0;
  
  let match;
  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    references.push(match[0]);
  }
  
  return references;
};

/**
 * Get the position of scripture references in text
 */
export interface ScriptureMatch {
  reference: string;
  start: number;
  end: number;
}

export const findScriptureReferences = (text: string): ScriptureMatch[] => {
  const matches: ScriptureMatch[] = [];
  SCRIPTURE_REGEX.lastIndex = 0;
  
  let match;
  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    matches.push({
      reference: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  
  return matches;
};

/**
 * Normalize a scripture reference for API calls
 */
export const normalizeReference = (reference: string): string => {
  // Remove extra whitespace and normalize
  return reference
    .replace(/\s+/g, ' ')
    .replace(/[-–—]+/g, '-')
    .trim();
};
