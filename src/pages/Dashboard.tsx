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
      <div className="flex-1 px-6 md:px-10 py-8 overflow-auto bg-background">
        {/* Hero Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to Preachery
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your powerful sermon preparation tool. Turn inspiration into impactful messages with our intuitive block editor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="rounded-xl px-8 shadow-md hover:shadow-lg transition-shadow" onClick={handleNewSermon}>
                <Plus className="mr-2 h-5 w-5" />
                Start New Sermon
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl px-8 hover:bg-primary/5" onClick={() => navigate("/templates")}>
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
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Total Sermons
                    </p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--soft-blue-light))] flex items-center justify-center">
                    <FileText className="h-6 w-6 text-[hsl(var(--soft-blue))]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      This Week
                    </p>
                    <p className="text-3xl font-bold">{stats.thisWeek}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--green-light))] flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-[hsl(var(--green-fresh))]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Total Blocks
                    </p>
                    <p className="text-3xl font-bold">{stats.totalBlocks}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--orange-light))] flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-[hsl(var(--orange-warm))]" />
                  </div>
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
              <Button variant="ghost" onClick={() => navigate("/sermons")} className="hover:bg-primary/5">
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
                  <Card className="border-none shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{sermon.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
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
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full shadow-sm"
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
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No sermons yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first sermon to get started
                </p>
                <Button onClick={handleNewSermon} className="shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sermon
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/templates")}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-[hsl(var(--purple-light))] flex items-center justify-center shrink-0">
                  <FileCode className="h-6 w-6 text-[hsl(var(--purple-soft))]" />
                </div>
                <div>
                  <CardTitle className="mb-2">Sermon Templates</CardTitle>
                  <CardDescription>
                    Start with proven sermon structures
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/resources")}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-[hsl(var(--orange-light))] flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6 text-[hsl(var(--orange-warm))]" />
                </div>
                <div>
                  <CardTitle className="mb-2">Resources</CardTitle>
                  <CardDescription>
                    Access study materials and references
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
