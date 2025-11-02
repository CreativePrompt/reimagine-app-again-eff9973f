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
              key={`${block.id}-number`}
              defaultValue={block.number ?? ""}
              onBlur={(e) => {
                const newValue = e.target.value ? parseInt(e.target.value) : null;
                if (newValue !== block.number) {
                  onUpdate({ number: newValue });
                }
              }}
              placeholder="1"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              key={`${block.id}-title`}
              defaultValue={block.title}
              onBlur={(e) => {
                if (e.target.value !== block.title) {
                  onUpdate({ title: e.target.value });
                }
              }}
              placeholder="Point title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              key={`${block.id}-body`}
              defaultValue={block.body}
              onBlur={(e) => {
                if (e.target.value !== block.body) {
                  onUpdate({ body: e.target.value });
                }
              }}
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
              key={`${block.id}-reference`}
              defaultValue={block.reference}
              onBlur={(e) => {
                if (e.target.value !== block.reference) {
                  onUpdate({ reference: e.target.value });
                }
              }}
              placeholder="John 3:16"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Scripture Text</Label>
            <Textarea
              key={`${block.id}-text`}
              defaultValue={block.text}
              onBlur={(e) => {
                if (e.target.value !== block.text) {
                  onUpdate({ text: e.target.value });
                }
              }}
              placeholder="For God so loved the world..."
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Translation (optional)</Label>
            <Input
              key={`${block.id}-translation`}
              defaultValue={block.translation || ""}
              onBlur={(e) => {
                if (e.target.value !== (block.translation || "")) {
                  onUpdate({ translation: e.target.value });
                }
              }}
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
              key={`${block.id}-title`}
              defaultValue={block.title}
              onBlur={(e) => {
                if (e.target.value !== block.title) {
                  onUpdate({ title: e.target.value });
                }
              }}
              placeholder="Illustration title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Story/Illustration</Label>
            <Textarea
              key={`${block.id}-body`}
              defaultValue={block.body}
              onBlur={(e) => {
                if (e.target.value !== block.body) {
                  onUpdate({ body: e.target.value });
                }
              }}
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
              key={`${block.id}-title`}
              defaultValue={block.title}
              onBlur={(e) => {
                if (e.target.value !== block.title) {
                  onUpdate({ title: e.target.value });
                }
              }}
              placeholder="Application title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Application</Label>
            <Textarea
              key={`${block.id}-body`}
              defaultValue={block.body}
              onBlur={(e) => {
                if (e.target.value !== block.body) {
                  onUpdate({ body: e.target.value });
                }
              }}
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
              key={`${block.id}-text`}
              defaultValue={block.text}
              onBlur={(e) => {
                if (e.target.value !== block.text) {
                  onUpdate({ text: e.target.value });
                }
              }}
              placeholder="Enter the quote..."
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Author (optional)</Label>
            <Input
              key={`${block.id}-author`}
              defaultValue={block.author || ""}
              onBlur={(e) => {
                if (e.target.value !== (block.author || "")) {
                  onUpdate({ author: e.target.value });
                }
              }}
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
              key={`${block.id}-url`}
              defaultValue={block.url}
              onBlur={(e) => {
                if (e.target.value !== block.url) {
                  onUpdate({ url: e.target.value });
                }
              }}
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
              key={`${block.id}-title`}
              defaultValue={block.title}
              onBlur={(e) => {
                if (e.target.value !== block.title) {
                  onUpdate({ title: e.target.value });
                }
              }}
              placeholder="Section title"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              key={`${block.id}-body`}
              defaultValue={block.body}
              onBlur={(e) => {
                if (e.target.value !== block.body) {
                  onUpdate({ body: e.target.value });
                }
              }}
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
              key={`${block.id}-title`}
              defaultValue={block.title}
              onBlur={(e) => {
                if (e.target.value !== block.title) {
                  onUpdate({ title: e.target.value });
                }
              }}
              placeholder="Note title"
              className="h-8"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Summaries</Label>
              <button
                type="button"
                onClick={() => {
                  onUpdate({ summaries: [...block.summaries, ""] });
                }}
                className="text-xs text-primary hover:underline"
              >
                + Add Summary
              </button>
            </div>
            {block.summaries.map((summary, index) => (
              <div key={`${block.id}-summary-${index}`} className="relative">
                <Textarea
                  defaultValue={summary}
                  onBlur={(e) => {
                    const newSummaries = [...block.summaries];
                    newSummaries[index] = e.target.value;
                    onUpdate({ summaries: newSummaries });
                  }}
                  placeholder="Key insights from your reading..."
                  rows={3}
                />
                {block.summaries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newSummaries = block.summaries.filter((_, i) => i !== index);
                      onUpdate({ summaries: newSummaries });
                    }}
                    className="absolute top-2 right-2 text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
