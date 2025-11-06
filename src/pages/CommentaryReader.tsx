import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Highlighter } from "lucide-react";
import { toast } from "sonner";
import type { Commentary, Highlight } from "@/lib/store/commentaryStore";

export default function CommentaryReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadCommentary();
      loadHighlights();
    }
  }, [user, id]);

  const loadCommentary = async () => {
    const { data, error } = await supabase
      .from("commentaries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading commentary:", error);
      toast.error("Failed to load commentary");
      navigate("/commentary");
      return;
    }

    setCommentary(data);
    setIsLoading(false);
  };

  const loadHighlights = async () => {
    const { data, error } = await supabase
      .from("commentary_highlights")
      .select("*")
      .eq("commentary_id", id)
      .order("start_offset");

    if (error) {
      console.error("Error loading highlights:", error);
      return;
    }

    setHighlights(data || []);
  };

  const handleTextSelection = async () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") return;

    const text = selection.toString();
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(document.getElementById("reader-content")!);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + text.length;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("commentary_highlights")
      .insert({
        commentary_id: id,
        user_id: user.id,
        text,
        start_offset: startOffset,
        end_offset: endOffset,
        color: "yellow",
      });

    if (error) {
      console.error("Error saving highlight:", error);
      toast.error("Failed to save highlight");
      return;
    }

    toast.success("Text highlighted");
    loadHighlights();
    selection.removeAllRanges();
  };

  const handleSearch = () => {
    if (!commentary?.extracted_text || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const text = commentary.extracted_text.toLowerCase();
    const query = searchQuery.toLowerCase();
    const results: number[] = [];
    let index = text.indexOf(query);

    while (index !== -1) {
      results.push(index);
      index = text.indexOf(query, index + 1);
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      scrollToSearchResult(0);
      toast.success(`Found ${results.length} result${results.length === 1 ? "" : "s"}`);
    } else {
      toast.info("No results found");
    }
  };

  const scrollToSearchResult = (index: number) => {
    // Simple scroll implementation - could be enhanced
    const element = document.getElementById("reader-content");
    if (element) {
      element.scrollTop = 0;
    }
  };

  const renderTextWithHighlights = () => {
    if (!commentary?.extracted_text) return null;

    let text = commentary.extracted_text;
    const segments: Array<{ text: string; highlighted: boolean }> = [];
    let lastIndex = 0;

    // Sort highlights by start_offset
    const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);

    sortedHighlights.forEach((highlight) => {
      if (highlight.start_offset > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, highlight.start_offset),
          highlighted: false,
        });
      }
      segments.push({
        text: text.slice(highlight.start_offset, highlight.end_offset),
        highlighted: true,
      });
      lastIndex = highlight.end_offset;
    });

    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        highlighted: false,
      });
    }

    return segments.map((segment, index) => (
      segment.highlighted ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50">
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    ));
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!commentary) {
    return null;
  }

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-8 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/commentary")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
            <h1 className="text-3xl font-bold mb-2">{commentary.title}</h1>
            {commentary.author && (
              <p className="text-muted-foreground">by {commentary.author}</p>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search in this commentary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 flex items-start gap-2">
            <Highlighter className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">How to highlight:</p>
              <p className="text-muted-foreground">
                Select any text in the reader below to highlight it. Your highlights will be saved automatically.
              </p>
            </div>
          </div>

          {/* Reader Content */}
          <div
            id="reader-content"
            className="prose prose-lg dark:prose-invert max-w-none bg-card p-12 rounded-lg shadow-sm"
            onMouseUp={handleTextSelection}
            style={{
              lineHeight: "1.9",
              fontSize: "17px",
              fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
            }}
          >
            <div className="whitespace-pre-wrap break-words">
              {renderTextWithHighlights()}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}