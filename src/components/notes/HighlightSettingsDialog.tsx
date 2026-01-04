import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Check, Settings } from "lucide-react";

export interface HighlightSettings {
  color: string;
  brightness: number; // 0-100, 50 is default
  singleSelectMode: boolean;
  clearOnClickOutside: boolean;
  // Legacy spotlight settings (kept for backwards compatibility)
  spotlightMode?: boolean;
  spotlightDimBackground?: boolean;
  spotlightAutoClose?: boolean;
}

const PRESET_COLORS = [
  { name: "Green", value: "green", hsl: "142 76% 36%" },
  { name: "Yellow", value: "yellow", hsl: "48 96% 53%" },
  { name: "Blue", value: "blue", hsl: "217 91% 60%" },
  { name: "Pink", value: "pink", hsl: "330 81% 60%" },
  { name: "Orange", value: "orange", hsl: "25 95% 53%" },
  { name: "Purple", value: "purple", hsl: "263 70% 50%" },
  { name: "Teal", value: "teal", hsl: "174 72% 40%" },
  { name: "Red", value: "red", hsl: "0 72% 51%" },
];

interface HighlightSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: HighlightSettings;
  onSave: (settings: HighlightSettings) => void;
}

export function HighlightSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: HighlightSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<HighlightSettings>(settings);

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  const getColorHsl = (colorValue: string) => {
    const color = PRESET_COLORS.find((c) => c.value === colorValue);
    return color?.hsl || PRESET_COLORS[0].hsl;
  };

  // Calculate adjusted lightness based on brightness
  const getAdjustedColor = (colorValue: string, brightness: number) => {
    const color = PRESET_COLORS.find((c) => c.value === colorValue);
    if (!color) return PRESET_COLORS[0].hsl;

    const parts = color.hsl.split(" ");
    const h = parts[0];
    const s = parts[1];
    const baseLightness = parseInt(parts[2]);

    // Adjust lightness based on brightness (brightness 0 = darker, 100 = lighter)
    const adjustment = (brightness - 50) * 0.4;
    const newLightness = Math.max(20, Math.min(80, baseLightness + adjustment));

    return `${h} ${s} ${newLightness}%`;
  };

  const previewHsl = getAdjustedColor(localSettings.color, localSettings.brightness);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Highlight Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Color Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Highlight Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() =>
                    setLocalSettings((prev) => ({ ...prev, color: color.value }))
                  }
                  className={`h-10 rounded-lg transition-all flex items-center justify-center ${
                    localSettings.color === color.value
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: `hsl(${color.hsl})` }}
                  title={color.name}
                >
                  {localSettings.color === color.value && (
                    <Check className="h-5 w-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Brightness Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Brightness</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.brightness < 40
                  ? "Darker"
                  : localSettings.brightness > 60
                  ? "Lighter"
                  : "Normal"}
              </span>
            </div>
            <Slider
              value={[localSettings.brightness]}
              onValueChange={([value]) =>
                setLocalSettings((prev) => ({ ...prev, brightness: value }))
              }
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Darker</span>
              <span>Lighter</span>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div
              className="p-4 rounded-lg border-l-4 transition-all"
              style={{
                backgroundColor: `hsl(${previewHsl} / 0.3)`,
                borderLeftColor: `hsl(${previewHsl})`,
              }}
            >
              <p className="text-sm">
                This is how your highlighted text will look with the selected
                color and brightness.
              </p>
            </div>
          </div>

          {/* Single Select Mode */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Single Select Mode</Label>
              <p className="text-xs text-muted-foreground">
                Only one highlight stays selected at a time
              </p>
            </div>
            <Switch
              checked={localSettings.singleSelectMode}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  singleSelectMode: checked,
                }))
              }
            />
          </div>

          {/* Clear on Click Outside - only show when single select is OFF */}
          {!localSettings.singleSelectMode && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Clear on Click Outside</Label>
                <p className="text-xs text-muted-foreground">
                  Deselect all highlights when clicking outside the text area
                </p>
              </div>
              <Switch
                checked={localSettings.clearOnClickOutside}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    clearOnClickOutside: checked,
                  }))
                }
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export preset colors for use in CSS generation
export { PRESET_COLORS };
