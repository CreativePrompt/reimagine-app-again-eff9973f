import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/notes/RichTextEditor";
import { useNotesStore } from "@/lib/store/notesStore";
import { ArrowLeft, Trash2, Plus, X, Save, PanelLeftClose, PanelLeft, BookOpen, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'edit' | 'reader';

export default function NoteEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { notes, currentNote, loadNotes, updateNote, deleteNote, setCurrentNote } = useNotesStore();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !authLoading) {
      loadNotes();
    }
  }, [user, authLoading, loadNotes]);

  useEffect(() => {
    if (id && notes.length > 0) {
      const note = notes.find(n => n.id === id);
      if (note) {
        setCurrentNote(note);
        setTitle(note.title);
        setContent(note.content);
        setTags(note.tags || []);
        setHasUnsavedChanges(false);
      }
    }
  }, [id, notes, setCurrentNote]);

  const handleSave = async () => {
    if (!id) return;
    
    await updateNote(id, { title, content, tags });
    setHasUnsavedChanges(false);
    toast({
      title: "Note saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (confirm("Are you sure you want to delete this note?")) {
      await deleteNote(id);
      navigate("/notes");
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully.",
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag("");
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    setHasUnsavedChanges(true);
  };

  const handleChange = (field: 'title' | 'content', value: string) => {
    if (field === 'title') setTitle(value);
    else setContent(value);
    setHasUnsavedChanges(true);
  };

  if (authLoading || !user) {
    return null;
  }

  const tagColors: { [key: string]: string } = {
    work: "bg-[hsl(var(--soft-blue))] text-white hover:bg-[hsl(var(--soft-blue))]/90",
    projects: "bg-[hsl(var(--orange-warm))] text-white hover:bg-[hsl(var(--orange-warm))]/90",
    personal: "bg-[hsl(var(--purple-soft))] text-white hover:bg-[hsl(var(--purple-soft))]/90",
    travel: "bg-[hsl(var(--soft-blue-light))] text-[hsl(var(--soft-blue))] hover:bg-[hsl(var(--soft-blue-light))]/80",
    learning: "bg-[hsl(var(--purple-light))] text-[hsl(var(--purple-soft))] hover:bg-[hsl(var(--purple-light))]/80",
    ideas: "bg-[hsl(var(--green-light))] text-[hsl(var(--green-fresh))] hover:bg-[hsl(var(--green-light))]/80"
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Notes List */}
      <AnimatePresence mode="wait">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r bg-card overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="flex-1 justify-start" 
                onClick={() => navigate("/notes")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Notes
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="ml-2"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-muted-foreground px-3 mb-2">MY NOTES</h3>
              <div className="space-y-1">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      note.id === id 
                        ? "bg-[hsl(var(--soft-blue-light))] border-l-4 border-[hsl(var(--soft-blue))]" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium text-sm line-clamp-1">{note.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 60) : "No content"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Header */}
        <div className="border-b bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            {currentNote && (
              <span className="text-sm text-muted-foreground">
                Last updated {formatDistanceToNow(new Date(currentNote.updated_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('edit')}
                className="rounded-none"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant={viewMode === 'reader' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('reader')}
                className="rounded-none"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Reader
              </Button>
            </div>
            
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="bg-[hsl(var(--soft-blue))] hover:bg-[hsl(var(--soft-blue))]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'edit' ? (
            <div className="p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                {/* Title */}
                <Input
                  value={title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Note title..."
                  className="text-4xl font-bold border-none focus-visible:ring-0 px-0 mb-4"
                />

                {/* Tags */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        className={`${tagColors[tag.toLowerCase()] || "bg-muted"} cursor-pointer`}
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="max-w-xs"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleAddTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content - Rich Text Editor */}
                <RichTextEditor
                  value={content}
                  onChange={(value) => handleChange('content', value)}
                  placeholder="Start writing your note..."
                />
              </motion.div>
            </div>
          ) : (
            /* Reader View */
            <div className="p-8 bg-muted/30 min-h-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-3xl mx-auto bg-card rounded-lg shadow-sm p-12"
              >
                {/* Reader Header */}
                <div className="text-center mb-8 pb-6 border-b">
                  <h1 className="text-4xl font-bold mb-3">{title || "Untitled Note"}</h1>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {tags.map((tag, index) => (
                        <Badge 
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {currentNote && (
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(currentNote.updated_at), { addSuffix: true })}
                    </p>
                  )}
                </div>

                {/* Reader Content */}
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground">No content yet...</p>' }}
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
