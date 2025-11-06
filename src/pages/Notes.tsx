import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotesStore } from "@/lib/store/notesStore";
import { Plus, Search, Grid3x3, List, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export default function Notes() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { notes, isLoading, loadNotes, createNote } = useNotesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Authentication check removed - allow viewing without login

  useEffect(() => {
    if (user && !authLoading) {
      loadNotes();
    }
  }, [user, authLoading, loadNotes]);

  const handleNewNote = async () => {
    const note = await createNote();
    if (note) {
      navigate(`/notes/${note.id}`);
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Removed auth loading check - allow access without login

  const tagColors: { [key: string]: string } = {
    work: "bg-[hsl(var(--soft-blue))] text-white",
    projects: "bg-[hsl(var(--orange-warm))] text-white",
    personal: "bg-[hsl(var(--purple-soft))] text-white",
    travel: "bg-[hsl(var(--soft-blue-light))] text-[hsl(var(--soft-blue))]",
    learning: "bg-[hsl(var(--purple-light))] text-[hsl(var(--purple-soft))]",
    ideas: "bg-[hsl(var(--green-light))] text-[hsl(var(--green-fresh))]"
  };

  return (
    <AppLayout>
      <div className="flex-1 px-6 md:px-10 py-8 overflow-auto bg-background">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notes</h1>
              <p className="text-muted-foreground">
                {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-[hsl(var(--soft-blue))] hover:bg-[hsl(var(--soft-blue))]/90 rounded-full h-14 w-14 p-0 shadow-lg" 
              onClick={handleNewNote}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="rounded-xl"
              >
                <Grid3x3 className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-xl"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Grid/List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading notes...
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="border-none shadow-md hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-lg">{note.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {note.content || "No content"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            className={tagColors[tag.toLowerCase()] || "bg-muted"}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-none shadow-md">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first note to get started
              </p>
              <Button onClick={handleNewNote} className="shadow-md">
                <Plus className="mr-2 h-4 w-4" />
                Create Note
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}