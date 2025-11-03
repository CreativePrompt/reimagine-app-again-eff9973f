import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSermonStore } from "@/lib/store/sermonStore";
import { Plus, FileText, Clock, TrendingUp, BookOpen, Edit, FileCode, Upload, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { sermons, isLoading, loadUserSermons, createSermonFromTemplate } = useSermonStore();
  const [heroImage, setHeroImage] = useState("");
  const [heroDim, setHeroDim] = useState(50);
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Load hero settings from Supabase
  useEffect(() => {
    const loadHeroSettings = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("hero_image, hero_dimming")
          .eq("id", user.id)
          .single();
        
        if (data && !error) {
          setHeroImage(data.hero_image || "");
          setHeroDim(data.hero_dimming || 50);
        }
      }
    };
    
    loadHeroSettings();
  }, [user]);
  
  const saveHeroSettings = async (image?: string, dimming?: number) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({
        hero_image: image !== undefined ? image : heroImage,
        hero_dimming: dimming !== undefined ? dimming : heroDim,
      })
      .eq("id", user.id);
    
    if (error) {
      toast.error("Failed to save settings");
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setHeroImage(result);
        saveHeroSettings(result, undefined);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleDimChange = (value: number[]) => {
    setHeroDim(value[0]);
    saveHeroSettings(undefined, value[0]);
  };

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
      <div className="flex-1 overflow-auto bg-background">
        {/* Hero Section with Background Image */}
        <motion.div
          className="relative min-h-[400px] flex items-center justify-center overflow-visible pb-32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundImage: heroImage ? `url(${heroImage})` : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--purple-soft)) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay with adjustable dimming */}
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: heroDim / 100 }}
          />
          
          {/* Hero Content */}
          <div className="relative z-10 text-center max-w-3xl mx-auto px-6 py-16">
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.email?.split('@')[0] || 'Friend'}.
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                size="lg" 
                className="bg-[hsl(var(--green-accent))] hover:bg-[hsl(var(--green-fresh))] text-white rounded-xl px-8 shadow-lg hover:shadow-xl transition-all" 
                onClick={handleNewSermon}
              >
                <Plus className="mr-2 h-5 w-5" />
                Start New Sermon
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl px-8 backdrop-blur-sm">
                    <Settings className="mr-2 h-5 w-5" />
                    Customize Hero
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Customize Hero Section</DialogTitle>
                    <DialogDescription>
                      Upload a background image and adjust the dimming effect
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="hero-image">Background Image</Label>
                      <Input
                        id="hero-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Background Dimming: {heroDim}%</Label>
                      <Slider
                        value={[heroDim]}
                        onValueChange={handleDimChange}
                        max={80}
                        min={0}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="px-6 md:px-10 pb-8 pt-8">
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
      </div>
    </AppLayout>
  );
}
