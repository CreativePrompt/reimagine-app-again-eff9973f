import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, StickyNote } from "lucide-react";
import { toast } from "sonner";
import type { Commentary, Highlight } from "@/lib/store/commentaryStore";
import { ModernDocumentView } from "@/components/commentary/ModernDocumentView";
import { NotesPanel } from "@/components/commentary/NotesPanel";

interface Note {
  id: string;
  commentary_id: string;
  user_id: string;
  content: string;
  position_offset: number;
  created_at: string;
  updated_at: string;
}

export default function CommentaryReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadCommentary();
      loadHighlights();
      loadNotes();
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

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("commentary_notes")
      .select("*")
      .eq("commentary_id", id)
      .order("position_offset");

    if (error) {
      console.error("Error loading notes:", error);
      return;
    }

    setNotes(data || []);
  };

  const handleSearch = () => {
    if (!commentary?.extracted_text || !searchQuery.trim()) {
      toast.info("Enter a search term");
      setSearchResults([]);
      return;
    }

    const text = commentary.extracted_text;
    const query = searchQuery.toLowerCase();
    const indices: number[] = [];
    let index = text.toLowerCase().indexOf(query);
    
    while (index !== -1) {
      indices.push(index);
      index = text.toLowerCase().indexOf(query, index + 1);
    }

    setSearchResults(indices);
    setCurrentSearchIndex(0);

    if (indices.length > 0) {
      toast.success(`Found ${indices.length} result${indices.length === 1 ? "" : "s"}`);
      scrollToSearchResult(0, indices);
    } else {
      toast.info("No results found");
    }
  };

  const scrollToSearchResult = (index: number, results: number[]) => {
    if (results.length === 0 || !contentRef.current) return;
    
    const offset = results[index];
    const element = contentRef.current;
    // Rough estimate of scroll position
    const scrollPosition = (offset / (commentary?.extracted_text?.length || 1)) * element.scrollHeight;
    element.scrollTo({ top: scrollPosition, behavior: "smooth" });
  };

  const handleHighlight = async (text: string, startOffset: number, endOffset: number, color: string) => {
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
        color,
      });

    if (error) {
      console.error("Error saving highlight:", error);
      toast.error("Failed to save highlight");
      return;
    }

    toast.success("Text highlighted");
    loadHighlights();
  };

  const handleRemoveHighlight = async (highlightId: string) => {
    const { error } = await supabase
      .from("commentary_highlights")
      .delete()
      .eq("id", highlightId);

    if (error) {
      console.error("Error removing highlight:", error);
      toast.error("Failed to remove highlight");
      return;
    }

    toast.success("Highlight removed");
    loadHighlights();
  };

  const handleUpdateHighlight = async (highlightId: string, color: string) => {
    const { error } = await supabase
      .from("commentary_highlights")
      .update({ color })
      .eq("id", highlightId);

    if (error) {
      console.error("Error updating highlight:", error);
      toast.error("Failed to update highlight");
      return;
    }

    toast.success("Highlight updated");
    loadHighlights();
  };

  const handleAddNote = async (content: string, offset: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("commentary_notes")
      .insert({
        commentary_id: id,
        user_id: user.id,
        content,
        position_offset: offset,
      });

    if (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
      return;
    }

    toast.success("Note added");
    loadNotes();
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    const { error } = await supabase
      .from("commentary_notes")
      .update({ content })
      .eq("id", noteId);

    if (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
      return;
    }

    toast.success("Note updated");
    loadNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("commentary_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
      return;
    }

    toast.success("Note deleted");
    loadNotes();
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
      <div className="h-full flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto px-4 py-4 lg:px-8 max-w-6xl">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/commentary")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <div className="flex-1" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotesPanel(!showNotesPanel)}
                className="gap-2"
              >
                <StickyNote className="h-4 w-4" />
                Notes ({notes.length})
              </Button>
            </div>

            <h1 className="text-2xl font-bold mb-2 text-foreground">
              {commentary.title}
            </h1>
            {commentary.author && (
              <p className="text-sm text-muted-foreground mb-4">
                by {commentary.author}
              </p>
            )}

            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search in this commentary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 rounded-full bg-background"
                />
              </div>
              <Button onClick={handleSearch} className="rounded-full">
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-auto bg-white dark:bg-white"
        >
          <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-12 max-w-4xl">
            <ModernDocumentView
              text={commentary.extracted_text || ""}
              highlights={highlights}
              notes={notes}
              onHighlight={handleHighlight}
              onRemoveHighlight={handleRemoveHighlight}
              onUpdateHighlight={handleUpdateHighlight}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          </div>
        </div>

        {/* Notes Panel */}
        <NotesPanel
          notes={notes}
          isOpen={showNotesPanel}
          onClose={() => setShowNotesPanel(false)}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onNavigateToNote={(offset) => {
            if (contentRef.current && commentary?.extracted_text) {
              // More accurate scroll calculation
              const text = commentary.extracted_text;
              const ratio = offset / text.length;
              const scrollPosition = ratio * contentRef.current.scrollHeight;
              contentRef.current.scrollTo({ 
                top: Math.max(0, scrollPosition - 100), // Offset for header
                behavior: "smooth" 
              });
            }
          }}
        />
      </div>
    </AppLayout>
  );
}