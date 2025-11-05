import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCommentaryStore } from "@/lib/store/commentaryStore";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const UploadCommentaryDialog = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { createCommentary } = useCommentaryStore();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText;
  };

  const handleUpload = async () => {
    if (!pdfFile || !title) {
      toast.error("Please provide a title and PDF file");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract text from PDF
      const extractedText = await extractTextFromPDF(pdfFile);

      // Upload PDF
      const pdfPath = `${user.id}/${Date.now()}-${pdfFile.name}`;
      const { error: pdfError } = await supabase.storage
        .from("commentary-pdfs")
        .upload(pdfPath, pdfFile);

      if (pdfError) throw pdfError;

      const { data: pdfUrlData } = supabase.storage
        .from("commentary-pdfs")
        .getPublicUrl(pdfPath);

      // Upload cover if provided
      let coverUrl = "";
      if (coverFile) {
        const coverPath = `${user.id}/${Date.now()}-${coverFile.name}`;
        const { error: coverError } = await supabase.storage
          .from("commentary-covers")
          .upload(coverPath, coverFile);

        if (coverError) throw coverError;

        const { data: coverUrlData } = supabase.storage
          .from("commentary-covers")
          .getPublicUrl(coverPath);
        coverUrl = coverUrlData.publicUrl;
      }

      // Create commentary record
      await createCommentary({
        title,
        author: author || undefined,
        pdf_url: pdfUrlData.publicUrl,
        cover_image_url: coverUrl || undefined,
        extracted_text: extractedText,
      });

      toast.success("Commentary uploaded successfully");
      setOpen(false);
      setTitle("");
      setAuthor("");
      setPdfFile(null);
      setCoverFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload commentary");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Commentary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Commentary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Commentary title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf">PDF File *</Label>
            <Input
              id="pdf"
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover">Cover Image (optional)</Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || !pdfFile || !title}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};