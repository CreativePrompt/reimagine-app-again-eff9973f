import { SermonBlock } from "@/lib/blockTypes";
import { useSermonStore } from "@/lib/store/sermonStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BlockFormProps {
  block: SermonBlock;
  onComplete?: () => void;
}

export function BlockForm({ block, onComplete }: BlockFormProps) {
  const { updateBlock } = useSermonStore();

  const handleUpdate = (updates: Partial<SermonBlock>) => {
    updateBlock(block.id, updates);
  };

  return (
    <div className="space-y-4">
      {block.kind === "point" && (
        <>
          <div>
            <Label htmlFor="number">Point Number (optional)</Label>
            <Input
              id="number"
              type="number"
              value={block.number ?? ""}
              onChange={(e) => handleUpdate({ number: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={block.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="Point title"
            />
          </div>
          <div>
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              value={block.body}
              onChange={(e) => handleUpdate({ body: e.target.value })}
              placeholder="Explain your point..."
              rows={4}
            />
          </div>
        </>
      )}

      {block.kind === "bible" && (
        <>
          <div>
            <Label htmlFor="reference">Scripture Reference</Label>
            <Input
              id="reference"
              value={block.reference}
              onChange={(e) => handleUpdate({ reference: e.target.value })}
              placeholder="John 3:16"
            />
          </div>
          <div>
            <Label htmlFor="text">Scripture Text</Label>
            <Textarea
              id="text"
              value={block.text}
              onChange={(e) => handleUpdate({ text: e.target.value })}
              placeholder="For God so loved the world..."
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="translation">Translation (optional)</Label>
            <Input
              id="translation"
              value={block.translation || ""}
              onChange={(e) => handleUpdate({ translation: e.target.value })}
              placeholder="NIV"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={block.notes || ""}
              onChange={(e) => handleUpdate({ notes: e.target.value })}
              placeholder="Additional context or commentary..."
              rows={2}
            />
          </div>
        </>
      )}

      {block.kind === "illustration" && (
        <>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={block.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="Illustration title"
            />
          </div>
          <div>
            <Label htmlFor="body">Story/Illustration</Label>
            <Textarea
              id="body"
              value={block.body}
              onChange={(e) => handleUpdate({ body: e.target.value })}
              placeholder="Tell your story..."
              rows={6}
            />
          </div>
        </>
      )}

      {block.kind === "application" && (
        <>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={block.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="Application title"
            />
          </div>
          <div>
            <Label htmlFor="body">Application</Label>
            <Textarea
              id="body"
              value={block.body}
              onChange={(e) => handleUpdate({ body: e.target.value })}
              placeholder="How should people respond..."
              rows={4}
            />
          </div>
        </>
      )}

      {block.kind === "quote" && (
        <>
          <div>
            <Label htmlFor="text">Quote</Label>
            <Textarea
              id="text"
              value={block.text}
              onChange={(e) => handleUpdate({ text: e.target.value })}
              placeholder="Enter the quote..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="author">Author (optional)</Label>
            <Input
              id="author"
              value={block.author || ""}
              onChange={(e) => handleUpdate({ author: e.target.value })}
              placeholder="Author name"
            />
          </div>
          <div>
            <Label htmlFor="source">Source (optional)</Label>
            <Input
              id="source"
              value={block.source || ""}
              onChange={(e) => handleUpdate({ source: e.target.value })}
              placeholder="Book, article, etc."
            />
          </div>
        </>
      )}

      {block.kind === "media" && (
        <>
          <div>
            <Label htmlFor="type">Media Type</Label>
            <Select
              value={block.type}
              onValueChange={(value) => handleUpdate({ type: value as "image" | "video" | "audio" })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={block.url}
              onChange={(e) => handleUpdate({ url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              value={block.caption || ""}
              onChange={(e) => handleUpdate({ caption: e.target.value })}
              placeholder="Media description"
            />
          </div>
        </>
      )}

      {block.kind === "custom" && (
        <>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={block.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="Section title"
            />
          </div>
          <div>
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              value={block.body}
              onChange={(e) => handleUpdate({ body: e.target.value })}
              placeholder="Enter your content..."
              rows={6}
            />
          </div>
        </>
      )}

      {block.kind === "reader_note" && (
        <>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={block.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="Note title"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Summaries</Label>
              <button
                type="button"
                onClick={() => handleUpdate({ summaries: [...block.summaries, ""] })}
                className="text-xs text-primary hover:underline"
              >
                + Add Summary
              </button>
            </div>
            {block.summaries.map((summary, index) => (
              <div key={`summary-${index}`} className="relative">
                <Textarea
                  value={summary}
                  onChange={(e) => {
                    const newSummaries = [...block.summaries];
                    newSummaries[index] = e.target.value;
                    handleUpdate({ summaries: newSummaries });
                  }}
                  placeholder="Key insights from your reading..."
                  rows={4}
                />
                {block.summaries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newSummaries = block.summaries.filter((_, i) => i !== index);
                      handleUpdate({ summaries: newSummaries });
                    }}
                    className="absolute top-2 right-2 text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="author">Author (optional)</Label>
            <Input
              id="author"
              value={block.author || ""}
              onChange={(e) => handleUpdate({ author: e.target.value })}
              placeholder="Author name"
            />
          </div>
          <div>
            <Label htmlFor="source">Source (optional)</Label>
            <Input
              id="source"
              value={block.source || ""}
              onChange={(e) => handleUpdate({ source: e.target.value })}
              placeholder="Book, article, etc."
            />
          </div>
        </>
      )}
    </div>
  );
}
