import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSermonStore } from "@/lib/store/sermonStore";
import { Plus, FileText, Clock, TrendingUp, BookOpen, Edit, FileCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { sermons, isLoading, loadUserSermons, createSermonFromTemplate } = useSermonStore();
  
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

  const recentSermons = sermons.slice(0, 3);

  const handleNewSermon = async () => {
    try {
      const sermon = await createSermonFromTemplate("blank");
      navigate(`/sermon/${sermon.id}`);
    } catch (error) {
      console.error("Error creating sermon:", error);
    }
  };

  const stats = {
    total: sermons.length,
    thisWeek: sermons.filter(s => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(s.updatedAt) > weekAgo;
    }).length,
    totalBlocks: sermons.reduce((acc, s) => acc + (s.blocks?.length || 0), 0)
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="flex-1 px-6 md:px-10 py-8 overflow-auto">
        {/* Hero Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Welcome to Preachery
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your powerful sermon preparation tool. Turn inspiration into impactful messages with our intuitive block editor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="rounded-xl px-8" onClick={handleNewSermon}>
                <Plus className="mr-2 h-5 w-5" />
                Start New Sermon
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl px-8" onClick={() => navigate("/templates")}>
                <FileText className="mr-2 h-5 w-5" />
                Browse Templates
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sermons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-3xl font-bold">{stats.thisWeek}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Blocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <span className="text-3xl font-bold">{stats.totalBlocks}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Sermons */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Recent Sermons</h2>
            {sermons.length > 0 && (
              <Button variant="ghost" onClick={() => navigate("/sermons")}>
                View All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading sermons...
            </div>
          ) : recentSermons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSermons.map((sermon) => (
                <motion.div
                  key={sermon.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{sermon.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {sermon.subtitle || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(sermon.updatedAt), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{sermon.blocks?.length || 0} blocks</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-4"
                        onClick={() => navigate(`/sermon/${sermon.id}`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No sermons yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first sermon to get started
                </p>
                <Button onClick={handleNewSermon}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sermon
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/templates")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Sermon Templates
              </CardTitle>
              <CardDescription>
                Start with proven sermon structures
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/resources")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Resources
              </CardTitle>
              <CardDescription>
                Access study materials and references
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
