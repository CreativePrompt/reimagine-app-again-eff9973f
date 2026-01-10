import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Book, 
  X, 
  Loader2, 
  ChevronRight,
  BookOpen,
  Quote,
  Link2,
  Copy,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BIBLE_BOOKS, getAllBooks } from "@/lib/bibleBooks";
import { useToast } from "@/hooks/use-toast";

interface ScriptureSearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertScripture?: (reference: string, text: string) => void;
}

interface VerseResult {
  reference: string;
  text: string;
  canonical?: string;
}

interface PhraseSearchResult {
  reference: string;
  content: string;
}

interface SearchResults {
  mainVerse: VerseResult | null;
  contextVerses: VerseResult[];
  relatedVerses: VerseResult[];
  phraseResults?: PhraseSearchResult[];
}

// Common cross-reference patterns (simplified - in production would use a proper database)
const CROSS_REFERENCES: { [key: string]: string[] } = {
  "Isaiah 7:14": ["Matthew 1:23", "Luke 1:31"],
  "Matthew 1:23": ["Isaiah 7:14", "Luke 1:31"],
  "Isaiah 9:6": ["Luke 2:11", "John 1:1", "Titus 2:13"],
  "John 3:16": ["Romans 5:8", "1 John 4:9-10", "Romans 6:23"],
  "Romans 8:28": ["Jeremiah 29:11", "Ephesians 1:11", "Genesis 50:20"],
  "Jeremiah 29:11": ["Romans 8:28", "Proverbs 3:5-6"],
  "Philippians 4:13": ["2 Corinthians 12:9-10", "Isaiah 40:31"],
  "Psalm 23:1": ["John 10:11", "Isaiah 40:11", "Ezekiel 34:15"],
  "Genesis 1:1": ["John 1:1-3", "Hebrews 11:3", "Psalm 33:6"],
  "John 1:1": ["Genesis 1:1", "Colossians 1:16-17", "Hebrews 1:2"],
  "Ephesians 2:8-9": ["Romans 3:24", "Titus 3:5", "Romans 11:6"],
  "Proverbs 3:5-6": ["Jeremiah 29:11", "Psalm 37:5", "Isaiah 26:3"],
};

export function ScriptureSearchSidebar({ isOpen, onClose, onInsertScripture }: ScriptureSearchSidebarProps) {
  const { toast } = useToast();
  const [searchMode, setSearchMode] = useState<"reference" | "phrase">("reference");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [showAllRelated, setShowAllRelated] = useState(false);
  
  // Reference search state
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapter, setChapter] = useState<string>("");
  const [verseStart, setVerseStart] = useState<string>("");
  const [verseEnd, setVerseEnd] = useState<string>("");
  const [quickReference, setQuickReference] = useState<string>("");
  
  // Phrase search state
  const [phraseQuery, setPhraseQuery] = useState("");

  const allBooks = getAllBooks();

  // Fetch a passage from the ESV API
  const fetchPassage = useCallback(async (passage: string): Promise<VerseResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('esv-bible', {
        body: { passage, includeVerseNumbers: true, includeHeadings: false }
      });

      if (error) {
        console.error('Error fetching passage:', error);
        return null;
      }

      if (data?.passages?.[0]) {
        return {
          reference: passage,
          text: data.passages[0].trim(),
          canonical: data.canonical
        };
      }
      return null;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, []);

  // Get context verses (3 before and 3 after)
  const getContextPassage = useCallback((book: string, chapterNum: number, verseNum: number) => {
    const startVerse = Math.max(1, verseNum - 3);
    const endVerse = verseNum + 3;
    return `${book} ${chapterNum}:${startVerse}-${endVerse}`;
  }, []);

  // Parse verse reference to extract components
  const parseReference = useCallback((ref: string) => {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (match) {
      return {
        book: match[1],
        chapter: parseInt(match[2]),
        verseStart: parseInt(match[3]),
        verseEnd: match[4] ? parseInt(match[4]) : parseInt(match[3])
      };
    }
    return null;
  }, []);

  // Search by direct reference input (quick search)
  const handleQuickReferenceSearch = useCallback(async () => {
    if (!quickReference.trim()) {
      toast({
        title: "Enter a reference",
        description: "Please type a Bible reference like 'John 3:16' or 'Romans 8:28-30'.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Fetch main verse using the typed reference
      const mainVerse = await fetchPassage(quickReference.trim());

      if (!mainVerse) {
        toast({
          title: "Verse not found",
          description: "Could not find the specified scripture. Try a format like 'John 3:16'.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Parse the canonical reference to get context
      const parsed = parseReference(mainVerse.canonical || quickReference);
      let contextVerses: VerseResult[] = [];
      
      if (parsed) {
        const contextPassage = getContextPassage(parsed.book, parsed.chapter, parsed.verseStart);
        const contextResult = await fetchPassage(contextPassage);
        if (contextResult) {
          contextVerses = [contextResult];
        }
      }

      // Find related verses from cross-references
      const canonicalRef = mainVerse.canonical || quickReference;
      const normalizedRef = canonicalRef.replace(/\s+/g, ' ').trim();
      
      let crossRefs: string[] = [];
      Object.keys(CROSS_REFERENCES).forEach(key => {
        if (normalizedRef.includes(key) || key.includes(normalizedRef.split(':')[0])) {
          crossRefs = [...crossRefs, ...CROSS_REFERENCES[key]];
        }
      });

      if (CROSS_REFERENCES[normalizedRef]) {
        crossRefs = [...crossRefs, ...CROSS_REFERENCES[normalizedRef]];
      }

      const uniqueRefs = [...new Set(crossRefs)].slice(0, 3);
      const relatedVerses: VerseResult[] = [];
      
      for (const ref of uniqueRefs) {
        const related = await fetchPassage(ref);
        if (related) {
          relatedVerses.push(related);
        }
      }

      setResults({
        mainVerse,
        contextVerses,
        relatedVerses
      });

    } catch (err) {
      console.error('Quick reference search error:', err);
      toast({
        title: "Search failed",
        description: "An error occurred while searching.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [quickReference, fetchPassage, parseReference, getContextPassage, toast]);

  // Search by reference (dropdowns)
  const handleReferenceSearch = useCallback(async () => {
    if (!selectedBook || !chapter || !verseStart) {
      toast({
        title: "Missing fields",
        description: "Please select a book, chapter, and starting verse.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const reference = verseEnd && verseEnd !== verseStart
        ? `${selectedBook} ${chapter}:${verseStart}-${verseEnd}`
        : `${selectedBook} ${chapter}:${verseStart}`;

      // Fetch main verse
      const mainVerse = await fetchPassage(reference);

      if (!mainVerse) {
        toast({
          title: "Verse not found",
          description: "Could not find the specified scripture.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Fetch context verses
      const contextPassage = getContextPassage(selectedBook, parseInt(chapter), parseInt(verseStart));
      const contextResult = await fetchPassage(contextPassage);

      // Find related verses from cross-references
      const canonicalRef = mainVerse.canonical || reference;
      const normalizedRef = canonicalRef.replace(/\s+/g, ' ').trim();
      
      // Look for cross-references
      let crossRefs: string[] = [];
      Object.keys(CROSS_REFERENCES).forEach(key => {
        if (normalizedRef.includes(key) || key.includes(normalizedRef.split(':')[0])) {
          crossRefs = [...crossRefs, ...CROSS_REFERENCES[key]];
        }
      });

      // Also check the exact reference
      if (CROSS_REFERENCES[normalizedRef]) {
        crossRefs = [...crossRefs, ...CROSS_REFERENCES[normalizedRef]];
      }

      // Fetch related verses (limit to 3)
      const uniqueRefs = [...new Set(crossRefs)].slice(0, 3);
      const relatedVerses: VerseResult[] = [];
      
      for (const ref of uniqueRefs) {
        const related = await fetchPassage(ref);
        if (related) {
          relatedVerses.push(related);
        }
      }

      setResults({
        mainVerse,
        contextVerses: contextResult ? [contextResult] : [],
        relatedVerses
      });

    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: "Search failed",
        description: "An error occurred while searching.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBook, chapter, verseStart, verseEnd, fetchPassage, getContextPassage, toast]);

  // Search by phrase using ESV search API
  const handlePhraseSearch = useCallback(async () => {
    if (!phraseQuery.trim()) {
      toast({
        title: "Enter a phrase",
        description: "Please enter a word or phrase to search.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Use the ESV search endpoint for keyword/phrase search
      const { data, error } = await supabase.functions.invoke('esv-bible', {
        body: { passage: phraseQuery.trim(), searchType: 'search' }
      });

      if (error) {
        console.error('Error searching:', error);
        toast({
          title: "Search failed",
          description: "An error occurred while searching.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!data?.results || data.results.length === 0) {
        toast({
          title: "No results",
          description: "Could not find verses matching your search. Try different keywords.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Map search results
      const phraseResults: PhraseSearchResult[] = data.results.map((result: { reference: string; content: string }) => ({
        reference: result.reference,
        content: result.content
      }));

      // Get the first result as the main verse for detail view
      const firstResult = data.results[0];
      const mainVerse = await fetchPassage(firstResult.reference);

      // Get context for the main verse
      let contextVerses: VerseResult[] = [];
      if (mainVerse) {
        const parsed = parseReference(mainVerse.canonical || firstResult.reference);
        if (parsed) {
          const contextPassage = getContextPassage(parsed.book, parsed.chapter, parsed.verseStart);
          const contextResult = await fetchPassage(contextPassage);
          if (contextResult) {
            contextVerses = [contextResult];
          }
        }
      }

      setResults({
        mainVerse,
        contextVerses,
        relatedVerses: [],
        phraseResults
      });

    } catch (err) {
      console.error('Phrase search error:', err);
      toast({
        title: "Search failed",
        description: "An error occurred while searching.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [phraseQuery, fetchPassage, parseReference, getContextPassage, toast]);

  // Copy verse to clipboard
  const handleCopy = useCallback((reference: string, text: string) => {
    const cleanText = text.replace(/\[\d+\]\s*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    navigator.clipboard.writeText(`${reference} — "${cleanText}" (ESV)`);
    setCopiedRef(reference);
    setTimeout(() => setCopiedRef(null), 2000);
    toast({
      title: "Copied",
      description: "Scripture copied to clipboard."
    });
  }, [toast]);

  // Insert verse into editor
  const handleInsert = useCallback((reference: string, text: string) => {
    if (onInsertScripture) {
      const cleanText = text.replace(/\[\d+\]\s*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      onInsertScripture(reference, cleanText);
      toast({
        title: "Inserted",
        description: "Scripture inserted into your note."
      });
    }
  }, [onInsertScripture, toast]);

  // Get max chapters for selected book
  const getMaxChapters = () => {
    const book = allBooks.find(b => b.name === selectedBook);
    return book?.chapters || 0;
  };

  // Clean verse text for display (remove verse numbers, collapse whitespace)
  const cleanVerseText = (text: string) => {
    return text
      .replace(/\[\d+\]\s*/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Highlight search phrase in text
  const highlightPhrase = (text: string, phrase: string) => {
    if (!phrase || !text) return text;
    
    const cleanedText = cleanVerseText(text);
    const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words.length === 0) return cleanedText;
    
    // Create a regex pattern that matches any of the search words
    const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    
    const parts = cleanedText.split(pattern);
    
    return parts.map((part, i) => {
      if (words.some(w => part.toLowerCase() === w.toLowerCase())) {
        return <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 px-0.5 rounded font-medium">{part}</mark>;
      }
      return part;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-l bg-card h-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Scripture Search</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Tabs */}
          <div className="p-4 border-b">
            <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "reference" | "phrase")}>
              <TabsList className="w-full">
                <TabsTrigger value="reference" className="flex-1">
                  <Book className="h-4 w-4 mr-1" />
                  By Reference
                </TabsTrigger>
                <TabsTrigger value="phrase" className="flex-1">
                  <Search className="h-4 w-4 mr-1" />
                  By Phrase
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reference" className="mt-4 space-y-4">
                {/* Quick Reference Input */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Quick Search</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type reference (e.g., John 3:16)"
                      value={quickReference}
                      onChange={(e) => setQuickReference(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickReferenceSearch()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleQuickReferenceSearch} 
                      size="icon"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or select</span>
                  </div>
                </div>

                {/* Book Select */}
                <Select value={selectedBook} onValueChange={setSelectedBook}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Book" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Old Testament</div>
                    {BIBLE_BOOKS["Old Testament"].map((book) => (
                      <SelectItem key={book.abbr} value={book.name}>
                        {book.name}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">New Testament</div>
                    {BIBLE_BOOKS["New Testament"].map((book) => (
                      <SelectItem key={book.abbr} value={book.name}>
                        {book.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Chapter and Verse */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Chapter"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      min={1}
                      max={getMaxChapters()}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Verse"
                      value={verseStart}
                      onChange={(e) => setVerseStart(e.target.value)}
                      min={1}
                    />
                  </div>
                  <span className="flex items-center text-muted-foreground">-</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="End"
                      value={verseEnd}
                      onChange={(e) => setVerseEnd(e.target.value)}
                      min={parseInt(verseStart) || 1}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleReferenceSearch} 
                  className="w-full"
                  disabled={loading || !selectedBook}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </TabsContent>

              <TabsContent value="phrase" className="mt-4 space-y-3">
                <Input
                  placeholder="Enter word or phrase..."
                  value={phraseQuery}
                  onChange={(e) => setPhraseQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhraseSearch()}
                />
                <Button 
                  onClick={handlePhraseSearch} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!loading && results && (
              <div className="p-4 space-y-6">
                {/* Main Verse */}
                {results.mainVerse && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Quote className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Main Verse</h4>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="font-medium text-primary mb-2">
                        {results.mainVerse.canonical || results.mainVerse.reference}
                      </p>
                      <p className="text-sm leading-relaxed">
                        {searchMode === "phrase" && phraseQuery 
                          ? highlightPhrase(results.mainVerse.text, phraseQuery)
                          : cleanVerseText(results.mainVerse.text)
                        }
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCopy(
                            results.mainVerse!.canonical || results.mainVerse!.reference,
                            results.mainVerse!.text
                          )}
                        >
                          {copiedRef === (results.mainVerse.canonical || results.mainVerse.reference) ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                        {onInsertScripture && (
                          <Button 
                            size="sm"
                            onClick={() => handleInsert(
                              results.mainVerse!.canonical || results.mainVerse!.reference,
                              results.mainVerse!.text
                            )}
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Insert
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Context */}
                {results.contextVerses.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                      <h4 className="font-semibold text-sm">Context</h4>
                      <span className="text-xs text-muted-foreground">(3 verses before & after)</span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="font-medium text-amber-700 dark:text-amber-400 mb-2 text-sm">
                        {results.contextVerses[0].canonical || results.contextVerses[0].reference}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {cleanVerseText(results.contextVerses[0].text)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Related/Cross References */}
                {results.relatedVerses.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-sm">Cross References</h4>
                    </div>
                    <div className="space-y-2">
                      {results.relatedVerses.map((verse, idx) => (
                        <div 
                          key={idx}
                          className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-green-700 dark:text-green-400 text-sm">
                              {verse.canonical || verse.reference}
                            </p>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleCopy(verse.canonical || verse.reference, verse.text)}
                              >
                                {copiedRef === (verse.canonical || verse.reference) ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              {onInsertScripture && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleInsert(verse.canonical || verse.reference, verse.text)}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {cleanVerseText(verse.text)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phrase Search Results */}
                {results.phraseResults && results.phraseResults.length > 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-purple-600" />
                        <h4 className="font-semibold text-sm">Related Verses</h4>
                        <span className="text-xs text-muted-foreground">({results.phraseResults.length} found)</span>
                      </div>
                      {results.phraseResults.length > 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2 text-purple-600 hover:text-purple-700"
                          onClick={() => setShowAllRelated(!showAllRelated)}
                        >
                          {showAllRelated ? "Show Less" : "See All"}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(showAllRelated ? results.phraseResults.slice(1) : results.phraseResults.slice(1, 6)).map((result, idx) => (
                        <div 
                          key={idx}
                          className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors"
                          onClick={async () => {
                            // Fetch full verse when clicked
                            const verse = await fetchPassage(result.reference);
                            if (verse) {
                              const parsed = parseReference(verse.canonical || result.reference);
                              let contextVerses: VerseResult[] = [];
                              if (parsed) {
                                const contextPassage = getContextPassage(parsed.book, parsed.chapter, parsed.verseStart);
                                const contextResult = await fetchPassage(contextPassage);
                                if (contextResult) {
                                  contextVerses = [contextResult];
                                }
                              }
                              setResults(prev => prev ? {
                                ...prev,
                                mainVerse: verse,
                                contextVerses
                              } : null);
                            }
                          }}
                        >
                          <p className="font-medium text-purple-700 dark:text-purple-400 text-sm mb-1">
                            {result.reference}
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {result.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No related verses message */}
                {results.relatedVerses.length === 0 && !results.phraseResults && results.mainVerse && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Link2 className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    <p>No cross-references found for this verse.</p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && !results && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Search for a scripture by reference or phrase to see results here.
                </p>
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
