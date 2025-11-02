import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { loadSettings, saveSettings, PresentationSettings } from "@/lib/liveChannel";

interface PresentationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (settings: PresentationSettings) => void;
  currentSettings?: PresentationSettings;
}

export function PresentationSettingsDialog({ open, onOpenChange, onSave, currentSettings }: PresentationSettingsDialogProps) {
  const [settings, setSettings] = useState<PresentationSettings>(currentSettings || loadSettings());

  useEffect(() => {
    if (open) {
      // Use current settings from parent if provided, otherwise load from localStorage
      setSettings(currentSettings || loadSettings());
    }
  }, [open, currentSettings]);

  const handleSave = () => {
    saveSettings(settings);
    onSave?.(settings);
    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings({ ...settings, bgImageDataUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Presentation Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Background Type</Label>
            <Select
              value={settings.bgType}
              onValueChange={(value) => setSettings({ ...settings, bgType: value as "solid" | "image" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid Color</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.bgType === "solid" && (
            <div className="space-y-2">
              <Label htmlFor="bgColor">Background Color</Label>
              <Input
                id="bgColor"
                type="color"
                value={settings.bgColor}
                onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })}
              />
            </div>
          )}

          {settings.bgType === "image" && (
            <div className="space-y-2">
              <Label htmlFor="bgImage">Background Image</Label>
              <Input
                id="bgImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {settings.bgImageDataUrl && (
                <img
                  src={settings.bgImageDataUrl}
                  alt="Background preview"
                  className="w-full h-32 object-cover rounded"
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Text Color</Label>
            <Select
              value={settings.textColor}
              onValueChange={(value) => setSettings({ ...settings, textColor: value as "white" | "black" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Text Alignment</Label>
            <Select
              value={settings.align}
              onValueChange={(value) => setSettings({ ...settings, align: value as "left" | "center" | "right" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sizeScale">Text Size Scale</Label>
            <Input
              id="sizeScale"
              type="number"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.sizeScale}
              onChange={(e) => setSettings({ ...settings, sizeScale: parseFloat(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="uppercase">Uppercase Text</Label>
            <Switch
              id="uppercase"
              checked={settings.uppercase}
              onCheckedChange={(checked) => setSettings({ ...settings, uppercase: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showFilmstrip">Show Filmstrip</Label>
            <Switch
              id="showFilmstrip"
              checked={settings.showFilmstrip}
              onCheckedChange={(checked) => setSettings({ ...settings, showFilmstrip: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dimInactive">Dim Inactive Lines</Label>
            <Switch
              id="dimInactive"
              checked={settings.dimInactive}
              onCheckedChange={(checked) => setSettings({ ...settings, dimInactive: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showWaitingMessage">Show Waiting Message</Label>
            <Switch
              id="showWaitingMessage"
              checked={settings.showWaitingMessage}
              onCheckedChange={(checked) => setSettings({ ...settings, showWaitingMessage: checked })}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
