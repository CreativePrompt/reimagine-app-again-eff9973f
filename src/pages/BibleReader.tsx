import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BibleDocumentView } from "@/components/bible/BibleDocumentView";
import { useBibleStore } from "@/lib/store/bibleStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, BookOpen, StickyNote } from "lucide-react";
import { getBookByName, getAllBooks } from "@/lib/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SearchResultsSidebar } from "@/components/commentary/SearchResultsSidebar";
import { NotesPanel } from "@/components/commentary/NotesPanel";

export default function BibleReader() {
  const { book, chapter } = useParams<{ book: string; chapter: string }>();
  const navigate = useNavigate();
  const [bibleText, setBibleText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ index: number; offset: number; context: string }>>([]);
  const [showSearchSidebar, setShowSearchSidebar] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
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

  useEffect(() => {
    if (book && chapter) {
      loadBibleText();
      loadHighlightsAndNotes(book, currentChapter);
    }
  }, [book, chapter]);

  const loadBibleText = async () => {
    setIsLoading(true);
    try {
      const passage = `${book} ${chapter}`;
      const { data, error } = await supabase.functions.invoke('esv-bible', {
        body: { passage, includeVerseNumbers: true, includeHeadings: true }
      });

      if (error) throw error;

      if (data.passages && data.passages.length > 0) {
        setBibleText(data.passages[0]);
      }
    } catch (error: any) {
      console.error('Error loading Bible text:', error);
      toast.error('Failed to load Bible text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !bibleText) {
      setSearchResults([]);
      setShowSearchSidebar(false);
      return;
    }

    const results: Array<{ index: number; offset: number; context: string }> = [];
    const searchLower = searchQuery.toLowerCase();
    let index = 0;

    let searchIndex = bibleText.toLowerCase().indexOf(searchLower, 0);
    while (searchIndex !== -1) {
      const contextStart = Math.max(0, searchIndex - 50);
      const contextEnd = Math.min(bibleText.length, searchIndex + searchQuery.length + 50);
      let context = bibleText.substring(contextStart, contextEnd);
      
      if (contextStart > 0) context = '...' + context;
      if (contextEnd < bibleText.length) context = context + '...';

      // Format context for SearchResultsSidebar (uses ** for highlighting)
      const highlightedContext = context.replace(
        new RegExp(`(${searchQuery})`, 'gi'),
        '**$1**'
      );

      results.push({
        index: index++,
        offset: searchIndex,
        context: highlightedContext,
      });

      searchIndex = bibleText.toLowerCase().indexOf(searchLower, searchIndex + 1);
    }

    setSearchResults(results);
    setShowSearchSidebar(results.length > 0);
    setCurrentSearchIndex(0);
  };

  const scrollToSearchResult = (index: number) => {
    if (!contentRef.current || !bibleText || !searchResults[index]) {
      return;
    }
    
    const offset = searchResults[index].offset;
    const element = contentRef.current;
    const text = bibleText;
    
    const ratio = offset / text.length;
    const scrollPosition = ratio * element.scrollHeight;
    
    element.scrollTo({ 
      top: Math.max(0, scrollPosition - 150), 
      behavior: "smooth" 
    });
    
    setCurrentSearchIndex(index);
  };

  const handleNavigateToNote = (offset: number) => {
    if (!contentRef.current || !bibleText) return;
    
    const ratio = offset / bibleText.length;
    const scrollPosition = ratio * contentRef.current.scrollHeight;
    
    contentRef.current.scrollTo({
      top: Math.max(0, scrollPosition - 150),
      behavior: "smooth"
    });
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
        <div className="flex-1 overflow-auto" ref={contentRef}>
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
                    <p className="text-sm text-muted-foreground">ESV Translation</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextChapter}
                    disabled={currentChapter === bookInfo.chapters && getAllBooks()[getAllBooks().length - 1].name === book}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search in this chapter..."
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
                  Search
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <BibleDocumentView
              text={bibleText}
              highlights={highlights}
              notes={notes}
              onHighlight={(text, start, end, color) => addHighlight(book!, currentChapter, text, start, end, color)}
              onRemoveHighlight={removeHighlight}
              onUpdateHighlight={updateHighlight}
              onAddNote={(content, offset) => addNote(book!, currentChapter, content, offset)}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
            />
          )}
        </div>

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
      </div>
    </AppLayout>
  );
}
