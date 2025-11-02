import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sermon } from "@/lib/blockTypes";
import { BlockDisplay } from "./BlockDisplay";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sermon: Sermon;
}

export function PreviewDialog({ open, onOpenChange, sermon }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{sermon.title}</h1>
            {sermon.subtitle && (
              <p className="text-lg text-muted-foreground">{sermon.subtitle}</p>
            )}
          </div>

          <div className="space-y-6">
            {sermon.blocks.map((block) => (
              <div key={block.id} className="border-l-4 border-primary pl-4">
                <BlockDisplay block={block} />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
