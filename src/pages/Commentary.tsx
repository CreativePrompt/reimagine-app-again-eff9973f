import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCommentaryStore } from "@/lib/store/commentaryStore";
import { UploadCommentaryDialog } from "@/components/commentary/UploadCommentaryDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Commentary() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { commentaries, isLoading, loadCommentaries, deleteCommentary } = useCommentaryStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadCommentaries();
    }
  }, [user, loadCommentaries]);

  const filteredCommentaries = commentaries.filter((commentary) =>
    commentary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    commentary.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      await deleteCommentary(id);
      toast.success("Commentary deleted");
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

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Commentary Library</h1>
              <p className="text-muted-foreground">
                {commentaries.length} {commentaries.length === 1 ? "commentary" : "commentaries"}
              </p>
            </div>
            <UploadCommentaryDialog />
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search commentaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bookshelf Grid */}
          {filteredCommentaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No commentaries yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first commentary to get started
              </p>
              <UploadCommentaryDialog />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredCommentaries.map((commentary, index) => (
                <motion.div
                  key={commentary.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group cursor-pointer hover:shadow-lg transition-all">
                    <CardContent className="p-0 relative">
                      <div
                        onClick={() => navigate(`/commentary/${commentary.id}`)}
                        className="aspect-[2/3] relative overflow-hidden rounded-t-lg"
                      >
                        {commentary.cover_image_url ? (
                          <img
                            src={commentary.cover_image_url}
                            alt={commentary.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <h3 className="font-semibold text-sm line-clamp-2">{commentary.title}</h3>
                        {commentary.author && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {commentary.author}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(commentary.id, commentary.title);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}