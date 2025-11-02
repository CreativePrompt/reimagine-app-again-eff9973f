import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { loadSettings, saveSettings, PresentationSettings } from "@/lib/liveChannel";
import { PRESET_BACKGROUNDS, urlToDataUrl, getPresetBackgroundUrl } from "@/lib/presetBackgrounds";
import { Check } from "lucide-react";

interface PresentationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (settings: PresentationSettings) => void;
  currentSettings?: PresentationSettings;
}

export function PresentationSettingsDialog({ open, onOpenChange, onSave, currentSettings }: PresentationSettingsDialogProps) {
  const [settings, setSettings] = useState<PresentationSettings>(currentSettings || loadSettings());
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);

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
        setSettings({ ...settings, bgImageDataUrl: event.target?.result as string, bgType: "image" });
        setSelectedPreset(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = async (presetId: string) => {
    setLoadingPreset(true);
    setSelectedPreset(presetId);
    
    try {
      const preset = PRESET_BACKGROUNDS.find(p => p.id === presetId);
      if (preset) {
        // Get the public URL from Supabase Storage
        const publicUrl = await getPresetBackgroundUrl(preset.fullPath);
        // Convert to data URL for storage in settings
        const dataUrl = await urlToDataUrl(publicUrl);
        setSettings({ ...settings, bgImageDataUrl: dataUrl, bgType: "image" });
      }
    } catch (error) {
      console.error("Error loading preset:", error);
      // Fallback to local file
      const preset = PRESET_BACKGROUNDS.find(p => p.id === presetId);
      if (preset) {
        const dataUrl = await urlToDataUrl(preset.thumbnail);
        setSettings({ ...settings, bgImageDataUrl: dataUrl, bgType: "image" });
      }
    } finally {
      setLoadingPreset(false);
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preset Backgrounds</Label>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_BACKGROUNDS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      disabled={loadingPreset}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                        selectedPreset === preset.id
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={preset.thumbnail}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedPreset === preset.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-primary-foreground drop-shadow-lg" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white font-medium truncate">{preset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bgImage">Or Upload Custom Image</Label>
                <Input
                  id="bgImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              
              {settings.bgImageDataUrl && (
                <div className="space-y-2">
                  <Label>Current Background Preview</Label>
                  <img
                    src={settings.bgImageDataUrl}
                    alt="Background preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
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

          <div className="flex items-center justify-between">
            <Label htmlFor="showTextBox">Show Text Box Background</Label>
            <Switch
              id="showTextBox"
              checked={settings.showTextBox}
              onCheckedChange={(checked) => setSettings({ ...settings, showTextBox: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="textBoxPadding">Text Box Padding (rem)</Label>
            <Input
              id="textBoxPadding"
              type="number"
              min="2"
              max="16"
              step="1"
              value={settings.textBoxPadding}
              onChange={(e) => setSettings({ ...settings, textBoxPadding: parseFloat(e.target.value) })}
              disabled={!settings.showTextBox}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lineHeight">Line Spacing (Height)</Label>
            <Input
              id="lineHeight"
              type="number"
              min="1.0"
              max="3.0"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => setSettings({ ...settings, lineHeight: parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wordSpacing">Word Spacing (Width)</Label>
            <Input
              id="wordSpacing"
              type="number"
              min="-5"
              max="50"
              step="1"
              value={settings.wordSpacing}
              onChange={(e) => setSettings({ ...settings, wordSpacing: parseFloat(e.target.value) })}
            />
          </div>

          <div className="pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSettings({
                  ...settings,
                  textBoxPadding: 12,
                  showTextBox: false,
                  lineHeight: 1.6,
                  wordSpacing: 3,
                });
              }}
              className="w-full"
            >
              Reset Text Formatting
            </Button>
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
