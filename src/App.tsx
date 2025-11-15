import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializePresetBackgrounds } from "@/lib/presetBackgrounds";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import SermonEditor from "./pages/SermonEditor";
import SermonsList from "./pages/SermonsList";
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import Commentary from "./pages/Commentary";
import CommentaryReader from "./pages/CommentaryReader";
import PresentationView from "./pages/PresentationView";
import PresenterView from "./pages/PresenterView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Initialize preset backgrounds on app load
  useEffect(() => {
    initializePresetBackgrounds().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/landing" element={<Index />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/sermons" element={<SermonsList />} />
              <Route path="/sermon/:id" element={<SermonEditor />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/notes/:id" element={<NoteEditor />} />
              <Route path="/commentary" element={<Commentary />} />
              <Route path="/commentary/:id" element={<CommentaryReader />} />
              <Route path="/present/:sessionId" element={<PresentationView />} />
              <Route path="/presenter/:sessionId" element={<PresenterView />} />
              <Route path="/ideas" element={<Dashboard />} />
              <Route path="/resources" element={<Dashboard />} />
              <Route path="/archive" element={<Dashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
