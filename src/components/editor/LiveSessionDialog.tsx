import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sermon } from "@/lib/blockTypes";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LiveSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sermon: Sermon;
}

export function LiveSessionDialog({ open, onOpenChange, sermon }: LiveSessionDialogProps) {
  const navigate = useNavigate();
  const [sessionId] = useState(() => `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const audienceUrl = `${window.location.origin}/present/${sessionId}`;
  const presenterUrl = `${window.location.origin}/presenter/${sessionId}`;

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} URL copied to clipboard`);
  };

  const handleStartPresenting = () => {
    // Store sermon data in sessionStorage for the presentation
    sessionStorage.setItem(`sermon-${sessionId}`, JSON.stringify(sermon));
    navigate(`/presenter/${sessionId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Go Live</DialogTitle>
          <DialogDescription>
            Share the audience view with your congregation. Use the presenter view to control what they see.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="audienceUrl">Audience View URL</Label>
            <div className="flex gap-2">
              <Input
                id="audienceUrl"
                value={audienceUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(audienceUrl, "Audience")}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(audienceUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this URL with your audience to display the sermon slides.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="presenterUrl">Presenter View URL</Label>
            <div className="flex gap-2">
              <Input
                id="presenterUrl"
                value={presenterUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(presenterUrl, "Presenter")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL to control the presentation and see your notes.
            </p>
          </div>

          <Button onClick={handleStartPresenting} className="w-full" size="lg">
            Start Presenting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
