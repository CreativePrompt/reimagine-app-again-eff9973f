import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Shuffle, Maximize2, Minimize2, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VERSE_CATEGORIES, ALL_VERSES } from "@/lib/verseCategories";
import { toast } from "sonner";

interface VerseData {
  reference: string;
  text: string;
}

function cleanVerseText(raw: string): string {
  // Strip ESV passage header, verse numbers, footnote markers, and trailing copyright
  let t = raw.replace(/\(ESV\)/g, "");
  // Remove leading reference line (first line if it's the heading)
  t = t.replace(/^\s*[^\n]+\n+/, (m) => (/^\s*\d/.test(m) ? m : ""));
  // Remove [number] verse numbers
  t = t.replace(/\[\d+\]/g, "");
  // Remove footnote markers like (1), (a)
  t = t.replace(/\(\d+\)/g, "");
  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();
  // Remove trailing copyright if present
  t = t.replace(/\s*The English Standard Version.*$/i, "").trim();
  return t;
}

export default function VerseOfTheDay() {
  const [category, setCategory] = useState<string>("all");
  const [currentRef, setCurrentRef] = useState<string>("Romans 8:28");
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  const fetchVerse = useCallback(async (reference: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("esv-bible", {
        body: { passage: reference, includeVerseNumbers: false, includeHeadings: false },
      });
      if (error) throw error;
      const passages: string[] = data?.passages || [];
      const text = cleanVerseText(passages.join(" "));
      setVerse({ reference: data?.canonical || reference, text });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load verse");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pick random verse on initial load
  useEffect(() => {
    const pool =
      category === "all"
        ? ALL_VERSES
        : VERSE_CATEGORIES.find((c) => c.id === category)?.references || ALL_VERSES;
    const randomRef = pool[Math.floor(Math.random() * pool.length)];
    setCurrentRef(randomRef);
  }, []);

  useEffect(() => {
    fetchVerse(currentRef);
  }, [currentRef, fetchVerse]);

  const pickRandom = () => {
    const pool =
      category === "all"
        ? ALL_VERSES
        : VERSE_CATEGORIES.find((c) => c.id === category)?.references || ALL_VERSES;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (next === currentRef && pool.length > 1) {
      next = pool[(pool.indexOf(next) + 1) % pool.length];
    }
    setCurrentRef(next);
  };

  // Keyboard: Esc exits presentation, Space/Right = new verse
  useEffect(() => {
    if (!presentationMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentationMode(false);
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        pickRandom();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentationMode, category, currentRef]);

  const VerseDisplay = ({ large }: { large: boolean }) => (
    <div className="flex flex-col items-center justify-center text-center w-full">
      <h2
        className={`font-extrabold tracking-tight uppercase text-white mb-8 ${
          large ? "text-7xl md:text-8xl" : "text-4xl md:text-5xl"
        }`}
      >
        Verse of the Day
      </h2>
      {loading ? (
        <Loader2 className="h-12 w-12 animate-spin text-white/70" />
      ) : verse ? (
        <>
          <p
            className={`text-white font-light leading-snug max-w-5xl mb-10 ${
              large ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"
            }`}
          >
            &ldquo;{verse.text}&rdquo;
          </p>
          <p
            className={`font-bold underline text-white ${
              large ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"
            }`}
          >
            {verse.reference}
          </p>
        </>
      ) : null}
    </div>
  );

  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-12">
        <VerseDisplay large />
        <div className="absolute top-6 right-6 flex gap-2">
          <Button variant="secondary" size="icon" onClick={pickRandom} disabled={loading}>
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setPresentationMode(false)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-sm">
          Press Space for new verse · Esc to exit
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Verse of the Day</h1>
            <p className="text-muted-foreground">Pick a category or shuffle to get a fresh verse.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {VERSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={pickRandom} disabled={loading} variant="default">
              <Shuffle className="h-4 w-4 mr-2" />
              New Verse
            </Button>
            <Button onClick={() => fetchVerse(currentRef)} disabled={loading} variant="outline" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setPresentationMode(true)} variant="secondary">
              <Maximize2 className="h-4 w-4 mr-2" />
              Presentation Mode
            </Button>
          </div>
        </div>

        <Card className="bg-black border-black aspect-video flex items-center justify-center p-10 overflow-hidden">
          <VerseDisplay large={false} />
        </Card>

        <div className="flex flex-wrap gap-2">
          {(category === "all"
            ? VERSE_CATEGORIES.flatMap((c) => c.references).slice(0, 24)
            : VERSE_CATEGORIES.find((c) => c.id === category)?.references || []
          ).map((ref) => (
            <Button
              key={ref}
              variant={ref === currentRef ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentRef(ref)}
            >
              {ref}
            </Button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
