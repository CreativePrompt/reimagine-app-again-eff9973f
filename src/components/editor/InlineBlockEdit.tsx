import { SermonBlock } from "@/lib/blockTypes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InlineBlockEditProps {
  block: SermonBlock;
  onUpdate: (updates: Partial<SermonBlock>) => void;
}

export function InlineBlockEdit({ block, onUpdate }: InlineBlockEditProps) {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      {block.kind === "point" && (
        <>
          <div>
            <Label className="text-xs">Point Number (optional)</Label>
            <Input
              type="number"
              value={block.number ?? ""}
              onChange={(e) => onUpdate({ number: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="1"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Point title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={block.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Explain your point..."
              rows={3}
            />
          </div>
        </>
      )}

      {block.kind === "bible" && (
        <>
          <div>
            <Label className="text-xs">Scripture Reference</Label>
            <Input
              value={block.reference}
              onChange={(e) => onUpdate({ reference: e.target.value })}
              placeholder="John 3:16"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Scripture Text</Label>
            <Textarea
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="For God so loved the world..."
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Translation (optional)</Label>
            <Input
              value={block.translation || ""}
              onChange={(e) => onUpdate({ translation: e.target.value })}
              placeholder="NIV"
              className="h-8"
            />
          </div>
        </>
      )}

      {block.kind === "illustration" && (
        <>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Illustration title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Story/Illustration</Label>
            <Textarea
              value={block.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Tell your story..."
              rows={4}
            />
          </div>
        </>
      )}

      {block.kind === "application" && (
        <>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Application title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Application</Label>
            <Textarea
              value={block.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="How should people respond..."
              rows={3}
            />
          </div>
        </>
      )}

      {block.kind === "quote" && (
        <>
          <div>
            <Label className="text-xs">Quote</Label>
            <Textarea
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter the quote..."
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Author (optional)</Label>
            <Input
              value={block.author || ""}
              onChange={(e) => onUpdate({ author: e.target.value })}
              placeholder="Author name"
              className="h-8"
            />
          </div>
        </>
      )}

      {block.kind === "media" && (
        <>
          <div>
            <Label className="text-xs">Media Type</Label>
            <Select
              value={block.type}
              onValueChange={(value) => onUpdate({ type: value as "image" | "video" | "audio" })}
            >
              <SelectTrigger className="h-8">
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
            <Label className="text-xs">URL</Label>
            <Input
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://..."
              className="h-8"
            />
          </div>
        </>
      )}

      {block.kind === "custom" && (
        <>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Section title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={block.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Enter your content..."
              rows={4}
            />
          </div>
        </>
      )}

      {block.kind === "reader_note" && (
        <>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Note title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea
              value={block.summary}
              onChange={(e) => onUpdate({ summary: e.target.value })}
              placeholder="Key insights from your reading..."
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}
