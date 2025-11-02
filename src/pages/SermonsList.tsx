import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSermonStore } from "@/lib/store/sermonStore";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Edit, Clock, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function SermonsList() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { sermons, isLoading, loadUserSermons, deleteSermon, createSermonFromTemplate } = useSermonStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !authLoading) {
      loadUserSermons();
    }
  }, [user, authLoading, loadUserSermons]);

  const handleNewSermon = async () => {
    try {
      const sermon = await createSermonFromTemplate("blank");
      navigate(`/sermon/${sermon.id}`);
    } catch (error) {
      console.error("Error creating sermon:", error);
      toast.error("Failed to create sermon");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteSermon(id);
        toast.success("Sermon deleted");
      } catch (error) {
        toast.error("Failed to delete sermon");
      }
    }
  };

  const filteredSermons = sermons.filter((sermon) =>
    sermon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sermon.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="flex-1 px-6 md:px-10 py-8 overflow-auto bg-background">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">All Sermons</h1>
              <p className="text-muted-foreground mt-1">
                {sermons.length} {sermons.length === 1 ? "sermon" : "sermons"} total
              </p>
            </div>
            <Button onClick={handleNewSermon} className="shadow-md hover:shadow-lg transition-shadow">
              <Plus className="h-4 w-4 mr-2" />
              New Sermon
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sermons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-none shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading sermons...
          </div>
        ) : filteredSermons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSermons.map((sermon) => (
              <Card
                key={sermon.id}
                className="border-none shadow-md hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="line-clamp-2">{sermon.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {sermon.subtitle || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(sermon.updatedAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{sermon.blocks?.length || 0} blocks</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 shadow-sm"
                      onClick={() => navigate(`/sermon/${sermon.id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sermon.id, sermon.title)}
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-none shadow-md">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No sermons found" : "No sermons yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first sermon to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleNewSermon} className="shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sermon
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
