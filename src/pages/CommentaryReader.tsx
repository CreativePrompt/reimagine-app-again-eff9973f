import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Menu, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Commentary, Highlight } from "@/lib/store/commentaryStore";
import { ModernDocumentView } from "@/components/commentary/ModernDocumentView";
import { CommentaryOutline } from "@/components/commentary/CommentaryOutline";

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
  const [outlineItems, setOutlineItems] = useState<Array<{ id: string; title: string; level: number; offset: number }>>([]);

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
    generateOutline(data.extracted_text || "");
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

  const generateOutline = (text: string) => {
    const lines = text.split("\n");
    const items: Array<{ id: string; title: string; level: number; offset: number }> = [];
    let currentOffset = 0;

    lines.forEach((line, index) => {
      // Detect headings (Chapter numbers, all caps, etc.)
      if (line.match(/^(Chapter \d+|CHAPTER \d+)/i)) {
        items.push({
          id: `heading-${index}`,
          title: line.trim(),
          level: 1,
          offset: currentOffset,
        });
      } else if (line.match(/^\d+\./) && line.length < 50) {
        items.push({
          id: `heading-${index}`,
          title: line.trim(),
          level: 2,
          offset: currentOffset,
        });
      } else if (line.match(/^[A-Z][A-Z\s]{10,}$/) && line.length < 50) {
        items.push({
          id: `heading-${index}`,
          title: line.trim(),
          level: 1,
          offset: currentOffset,
        });
      }
      currentOffset += line.length + 1; // +1 for newline
    });

    setOutlineItems(items);
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

  const handleSearch = () => {
    if (!commentary?.extracted_text || !searchQuery.trim()) {
      toast.info("Enter a search term");
      return;
    }

    const text = commentary.extracted_text.toLowerCase();
    const query = searchQuery.toLowerCase();
    const count = (text.match(new RegExp(query, "g")) || []).length;

    if (count > 0) {
      toast.success(`Found ${count} result${count === 1 ? "" : "s"}`);
      // Scroll to first occurrence
      const firstIndex = text.indexOf(query);
      if (firstIndex !== -1) {
        const element = document.getElementById("reader-content");
        if (element) {
          element.scrollTop = firstIndex * 0.5; // Rough estimate
        }
      }
    } else {
      toast.info("No results found");
    }
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
      <div className="h-full flex">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-80 border-r border-border bg-card">
          <CommentaryOutline
            items={outlineItems}
            onNavigate={(offset) => {
              const element = document.getElementById("reader-content");
              if (element) {
                element.scrollTop = offset * 0.5;
              }
            }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/commentary")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {/* Mobile Outline Toggle */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <Menu className="h-4 w-4 mr-2" />
                      Outline
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <CommentaryOutline
                      items={outlineItems}
                      onNavigate={(offset) => {
                        const element = document.getElementById("reader-content");
                        if (element) {
                          element.scrollTop = offset * 0.5;
                        }
                      }}
                    />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex items-start gap-4">
                <BookOpen className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2 text-foreground">
                    {commentary.title}
                  </h1>
                  {commentary.author && (
                    <p className="text-lg text-muted-foreground">
                      by {commentary.author}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search in this commentary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 rounded-full"
                />
              </div>
              <Button onClick={handleSearch} className="rounded-full">
                Search
              </Button>
            </div>

            {/* Reader Content */}
            <div
              id="reader-content"
              className="bg-background rounded-2xl shadow-sm border border-border p-8 lg:p-12"
            >
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
        </div>
      </div>
    </AppLayout>
  );
}