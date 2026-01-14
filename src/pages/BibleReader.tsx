import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BibleDocumentView } from "@/components/bible/BibleDocumentView";
import { useBibleStore } from "@/lib/store/bibleStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, BookOpen, StickyNote, BookText, X, Loader2 } from "lucide-react";
import { getBookByName, getAllBooks } from "@/lib/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SearchResultsSidebar } from "@/components/commentary/SearchResultsSidebar";
import { NotesPanel } from "@/components/commentary/NotesPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChapterData {
  chapter: number;
  text: string;
  startOffset: number;
}

interface VerseCommentary {
  verseRef: string;
  verseText: string;
  commentary: string;
}

interface CommentaryData {
  verses: VerseCommentary[];
  loading: boolean;
  selectedVerse: string | null;
}

export default function BibleReader() {
  const { book, chapter } = useParams<{ book: string; chapter: string }>();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ index: number; offset: number; context: string }>>([]);
  const [showSearchSidebar, setShowSearchSidebar] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showCommentaryPanel, setShowCommentaryPanel] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryData>({ 
    verses: [], 
    loading: false, 
    selectedVerse: null 
  });
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null);
  const [viewMoreDialogOpen, setViewMoreDialogOpen] = useState(false);
  const [viewMoreVerseData, setViewMoreVerseData] = useState<VerseCommentary | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);
  
  const {
    highlights,
    notes,
    loadHighlightsAndNotes,
    addHighlight,
    removeHighlight,
    updateHighlight,
    addNote,
    updateNote,
    deleteNote,
  } = useBibleStore();

  const bookInfo = getBookByName(book || "");
  const currentChapter = parseInt(chapter || "1");

  // Combine all chapter texts for searching and display
  const fullText = chapters.map(c => c.text).join('\n\n');

  useEffect(() => {
    if (book && chapter) {
      loadInitialChapters();
      loadHighlightsAndNotes(book, currentChapter);
    }
  }, [book, chapter]);

  const loadInitialChapters = async () => {
    setIsLoading(true);
    setChapters([]);
    
    // Load current chapter and 2 chapters ahead
    const chaptersToLoad = [];
    for (let i = 0; i <= 2; i++) {
      const chapNum = currentChapter + i;
      if (bookInfo && chapNum <= bookInfo.chapters) {
        chaptersToLoad.push(chapNum);
      }
    }
    
    const loadedChapters: ChapterData[] = [];
    let runningOffset = 0;
    
    for (const chapNum of chaptersToLoad) {
      const text = await fetchChapterText(chapNum);
      if (text) {
        loadedChapters.push({
          chapter: chapNum,
          text,
          startOffset: runningOffset,
        });
        runningOffset += text.length + 2; // +2 for the \n\n separator
      }
    }
    
    setChapters(loadedChapters);
    setIsLoading(false);
  };

  const fetchChapterText = async (chapterNum: number): Promise<string | null> => {
    try {
      const passage = `${book} ${chapterNum}`;
      const { data, error } = await supabase.functions.invoke('esv-bible', {
        body: { passage, includeVerseNumbers: true, includeHeadings: true }
      });

      if (error) throw error;

      if (data.passages && data.passages.length > 0) {
        return data.passages[0];
      }
      return null;
    } catch (error) {
      console.error('Error loading Bible text:', error);
      return null;
    }
  };

  // Load more chapters when scrolling near the bottom
  const handleScroll = useCallback(async () => {
    if (!contentRef.current || loadingRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 500;
    
    if (nearBottom && chapters.length > 0 && bookInfo) {
      const lastLoadedChapter = chapters[chapters.length - 1].chapter;
      if (lastLoadedChapter < bookInfo.chapters) {
        loadingRef.current = true;
        const nextChapter = lastLoadedChapter + 1;
        const text = await fetchChapterText(nextChapter);
        
        if (text) {
          setChapters(prev => {
            const lastOffset = prev.length > 0 
              ? prev[prev.length - 1].startOffset + prev[prev.length - 1].text.length + 2
              : 0;
            return [...prev, {
              chapter: nextChapter,
              text,
              startOffset: lastOffset,
            }];
          });
        }
        loadingRef.current = false;
      }
    }
  }, [chapters, bookInfo, book]);

  useEffect(() => {
    const scrollEl = contentRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll);
      return () => scrollEl.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Parse scripture reference like "Acts 2:38-42" or "John 3:16"
  const parseScriptureReference = (query: string): { book: string; chapter: number; startVerse?: number; endVerse?: number } | null => {
    // Pattern: Book Chapter:Verse or Book Chapter:StartVerse-EndVerse
    const referenceRegex = /^((?:\d\s)?[a-zA-Z]+(?:\s[a-zA-Z]+)?)\s*(\d+)(?::(\d+)(?:-(\d+))?)?$/i;
    const match = query.trim().match(referenceRegex);
    
    if (!match) return null;
    
    const [, bookName, chapterStr, startVerseStr, endVerseStr] = match;
    return {
      book: bookName.trim(),
      chapter: parseInt(chapterStr),
      startVerse: startVerseStr ? parseInt(startVerseStr) : undefined,
      endVerse: endVerseStr ? parseInt(endVerseStr) : undefined,
    };
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchSidebar(false);
      return;
    }

    // Check if it's a scripture reference
    const reference = parseScriptureReference(searchQuery);
    
    if (reference) {
      // Navigate to the specific passage
      const bookMatch = getBookByName(reference.book);
      if (bookMatch) {
        // If it's a different book or chapter, navigate there
        if (bookMatch.name !== book || reference.chapter !== currentChapter) {
          navigate(`/bible/${bookMatch.name}/${reference.chapter}`);
          toast.success(`Navigating to ${bookMatch.name} ${reference.chapter}${reference.startVerse ? `:${reference.startVerse}${reference.endVerse ? `-${reference.endVerse}` : ''}` : ''}`);
        }
        
        // If there's a specific verse, try to scroll to it
        if (reference.startVerse && fullText) {
          const versePattern = new RegExp(`\\[${reference.startVerse}\\]|\\b${reference.startVerse}\\s`, 'i');
          const verseMatch = fullText.match(versePattern);
          if (verseMatch && verseMatch.index !== undefined) {
            setTimeout(() => {
              scrollToOffset(verseMatch.index!);
            }, 500);
          }
        }
        return;
      } else {
        toast.error(`Book "${reference.book}" not found`);
      }
    }

    // Otherwise, do a text search
    const results: Array<{ index: number; offset: number; context: string }> = [];
    const searchLower = searchQuery.toLowerCase();
    let index = 0;

    let searchIndex = fullText.toLowerCase().indexOf(searchLower, 0);
    while (searchIndex !== -1) {
      const contextStart = Math.max(0, searchIndex - 50);
      const contextEnd = Math.min(fullText.length, searchIndex + searchQuery.length + 50);
      let context = fullText.substring(contextStart, contextEnd);
      
      if (contextStart > 0) context = '...' + context;
      if (contextEnd < fullText.length) context = context + '...';

      const highlightedContext = context.replace(
        new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '**$1**'
      );

      results.push({
        index: index++,
        offset: searchIndex,
        context: highlightedContext,
      });

      searchIndex = fullText.toLowerCase().indexOf(searchLower, searchIndex + 1);
    }

    setSearchResults(results);
    setShowSearchSidebar(results.length > 0);
    setCurrentSearchIndex(0);
    
    if (results.length === 0 && searchQuery.trim()) {
      toast.info('No results found in loaded chapters');
    }
  };

  const scrollToOffset = (offset: number) => {
    if (!contentRef.current || !fullText) return;
    
    const ratio = offset / fullText.length;
    const scrollPosition = ratio * contentRef.current.scrollHeight;
    
    contentRef.current.scrollTo({ 
      top: Math.max(0, scrollPosition - 150), 
      behavior: "smooth" 
    });
  };

  const scrollToSearchResult = (index: number) => {
    if (!searchResults[index]) return;
    scrollToOffset(searchResults[index].offset);
    setCurrentSearchIndex(index);
  };

  const handleNavigateToNote = (offset: number) => {
    scrollToOffset(offset);
  };

  const goToPreviousChapter = () => {
    if (!bookInfo) return;
    
    if (currentChapter > 1) {
      navigate(`/bible/${book}/${currentChapter - 1}`);
    } else {
      const allBooks = getAllBooks();
      const currentBookIndex = allBooks.findIndex(b => b.name === book);
      if (currentBookIndex > 0) {
        const prevBook = allBooks[currentBookIndex - 1];
        navigate(`/bible/${prevBook.name}/${prevBook.chapters}`);
      }
    }
  };

  const goToNextChapter = () => {
    if (!bookInfo) return;
    
    if (currentChapter < bookInfo.chapters) {
      navigate(`/bible/${book}/${currentChapter + 1}`);
    } else {
      const allBooks = getAllBooks();
      const currentBookIndex = allBooks.findIndex(b => b.name === book);
      if (currentBookIndex < allBooks.length - 1) {
        const nextBook = allBooks[currentBookIndex + 1];
        navigate(`/bible/${nextBook.name}/1`);
      }
    }
  };

  // Fetch Coffman commentary for the chapter
  const fetchCommentary = async (specificVerse?: string) => {
    setCommentary({ verses: [], loading: true, selectedVerse: specificVerse || null });
    setShowCommentaryPanel(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('coffman-commentary', {
        body: { 
          book, 
          chapter: currentChapter,
          verse: specificVerse || null
        }
      });

      if (error) throw error;

      setCommentary({
        verses: data.verses || [],
        loading: false,
        selectedVerse: specificVerse || null,
      });
    } catch (error) {
      console.error('Error fetching commentary:', error);
      setCommentary({
        verses: [],
        loading: false,
        selectedVerse: null,
      });
      toast.error('Failed to load commentary. Please try again.');
    }
  };

  if (!bookInfo) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Book not found</h2>
            <Button onClick={() => navigate('/bible')}>Go to Bible Library</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
            <div className="container mx-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/bible')}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Library
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">{book} {chapter}</h1>
                    <p className="text-sm text-muted-foreground">ESV Translation • Continuous Scroll</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={showCommentaryPanel ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!showCommentaryPanel) {
                        fetchCommentary();
                      } else {
                        setShowCommentaryPanel(false);
                      }
                    }}
                  >
                    <BookText className="h-4 w-4 mr-1" />
                    Commentary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotesPanel(!showNotesPanel)}
                  >
                    <StickyNote className="h-4 w-4 mr-1" />
                    Notes ({notes.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousChapter}
                    disabled={currentChapter === 1 && getAllBooks()[0].name === book}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextChapter}
                    disabled={currentChapter === bookInfo.chapters && getAllBooks()[getAllBooks().length - 1].name === book}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Search - now supports verse references */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search text or verse reference (e.g., Acts 2:38-42, John 3:16)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
                <Button
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={handleSearch}
                >
                  Go
                </Button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto" ref={contentRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </div>
              </div>
            ) : (
              <div>
                {chapters.map((chapterData, idx) => (
                  <div key={chapterData.chapter} className="border-b border-border/50">
                    {/* Chapter header */}
                    <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-8 py-2 text-sm font-medium text-muted-foreground">
                      {book} Chapter {chapterData.chapter}
                    </div>
                    <BibleDocumentView
                      text={chapterData.text}
                      highlights={highlights.filter(h => true)} // Filter for this chapter if needed
                      notes={notes}
                      onHighlight={(text, start, end, color) => addHighlight(book!, chapterData.chapter, text, start, end, color)}
                      onRemoveHighlight={removeHighlight}
                      onUpdateHighlight={updateHighlight}
                      onAddNote={(content, offset) => addNote(book!, chapterData.chapter, content, offset)}
                      onUpdateNote={updateNote}
                      onDeleteNote={deleteNote}
                    />
                  </div>
                ))}
                
                {/* Loading indicator for more chapters */}
                {chapters.length > 0 && bookInfo && chapters[chapters.length - 1].chapter < bookInfo.chapters && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scroll for more chapters...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Commentary Panel */}
        {showCommentaryPanel && (
          <div className="w-[420px] border-l border-border bg-background flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="font-semibold text-lg">Coffman Commentary</h3>
                <p className="text-sm text-muted-foreground">
                  {book} {currentChapter}
                  {commentary.selectedVerse && ` • Verse ${commentary.selectedVerse}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCommentaryPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Commentary Content */}
            <ScrollArea className="flex-1">
              {commentary.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading commentary...</span>
                </div>
              ) : commentary.verses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <BookText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No commentary found for this passage.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => fetchCommentary()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {commentary.verses.map((verse, index) => (
                    <div 
                      key={`${verse.verseRef}-${index}`} 
                      className="group"
                    >
                      {/* Verse Header */}
                      <button
                        className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedVerse(
                          expandedVerse === verse.verseRef ? null : verse.verseRef
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            {/* Verse Reference Badge */}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold text-sm mb-2">
                              {book} {verse.verseRef}
                            </span>
                            
                            {/* Verse Text Quote */}
                            {verse.verseText && (
                              <p className="text-sm font-medium text-foreground mt-2 italic border-l-2 border-primary/30 pl-3">
                                "{verse.verseText}"
                              </p>
                            )}
                            
                            {/* Commentary Preview */}
                            <p className={`text-sm text-muted-foreground mt-2 leading-relaxed ${
                              expandedVerse === verse.verseRef ? '' : 'line-clamp-3'
                            }`}>
                              {verse.commentary}
                            </p>
                          </div>
                          
                          <ChevronRight className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${
                            expandedVerse === verse.verseRef ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </button>
                      
                      {/* Expanded Content */}
                      {expandedVerse === verse.verseRef && (
                        <div className="px-4 pb-4 bg-muted/20">
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewMoreVerseData(verse);
                                setViewMoreDialogOpen(true);
                              }}
                            >
                              View Full
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${book} ${verse.verseRef}\n${verse.verseText ? `"${verse.verseText}"\n\n` : ''}${verse.commentary}`
                                );
                                toast.success('Commentary copied');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* Verse Quick Access Footer */}
            <div className="p-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Quick jump to verse:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 10 }, (_, i) => i * 3 + 1)
                  .filter(v => v <= 30)
                  .map(verse => (
                    <Button
                      key={verse}
                      variant={commentary.selectedVerse === String(verse) ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => fetchCommentary(String(verse))}
                    >
                      :{verse}
                    </Button>
                  ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => fetchCommentary()}
                >
                  All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Sidebar */}
        <SearchResultsSidebar
          isOpen={showSearchSidebar}
          onClose={() => setShowSearchSidebar(false)}
          searchQuery={searchQuery}
          results={searchResults}
          currentIndex={currentSearchIndex}
          onResultClick={scrollToSearchResult}
        />

        {/* Notes Panel */}
        <NotesPanel
          notes={notes}
          isOpen={showNotesPanel}
          onClose={() => setShowNotesPanel(false)}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onNavigateToNote={handleNavigateToNote}
        />

        {/* View More Dialog */}
        <Dialog open={viewMoreDialogOpen} onOpenChange={setViewMoreDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookText className="h-5 w-5" />
                Coffman Commentary — {book} {viewMoreVerseData?.verseRef || currentChapter}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {viewMoreVerseData ? (
                <div className="space-y-4">
                  {/* Verse Reference */}
                  <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                    {book} {viewMoreVerseData.verseRef}
                  </div>
                  
                  {/* Verse Text */}
                  {viewMoreVerseData.verseText && (
                    <blockquote className="border-l-4 border-primary/40 pl-4 py-2 italic text-foreground bg-muted/30 rounded-r-lg">
                      "{viewMoreVerseData.verseText}"
                    </blockquote>
                  )}
                  
                  {/* Commentary */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                      {viewMoreVerseData.commentary}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No commentary selected.</p>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  if (viewMoreVerseData) {
                    navigator.clipboard.writeText(
                      `${book} ${viewMoreVerseData.verseRef}\n${viewMoreVerseData.verseText ? `"${viewMoreVerseData.verseText}"\n\n` : ''}${viewMoreVerseData.commentary}`
                    );
                    toast.success('Commentary copied to clipboard');
                  }
                }}
              >
                Copy
              </Button>
              <Button onClick={() => setViewMoreDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
