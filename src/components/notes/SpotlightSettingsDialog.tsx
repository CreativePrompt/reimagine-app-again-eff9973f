import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Focus, Upload, Trash2, Check, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PRESET_BACKGROUNDS } from "@/lib/presetBackgrounds";

export interface SpotlightSettings {
  enabled: boolean;
  mode: 'standard' | 'presentation'; // Standard popup or presentation with background
  autoClose: boolean;
  // Background settings
  dimLevel: number; // 0-100
  blurBackground: boolean;
  blurAmount: number; // 0-20px
  // Popup size
  popupWidth: 'small' | 'medium' | 'large' | 'full';
  popupHeight: 'auto' | 'small' | 'medium' | 'large';
  // Presentation mode settings
  backgroundUrl: string | null;
  backgroundType: 'preset' | 'custom' | 'none';
  textColor: 'light' | 'dark';
  overlayDarkness: number; // 0-100
}

export const DEFAULT_SPOTLIGHT_SETTINGS: SpotlightSettings = {
  enabled: false,
  mode: 'standard',
  autoClose: true,
  dimLevel: 50,
  blurBackground: false,
  blurAmount: 8,
  popupWidth: 'medium',
  popupHeight: 'auto',
  backgroundUrl: null,
  backgroundType: 'none',
  textColor: 'light',
  overlayDarkness: 30,
};

interface SpotlightSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SpotlightSettings;
  onSave: (settings: SpotlightSettings) => void;
}

export function SpotlightSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: SpotlightSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<SpotlightSettings>(settings);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
      loadCustomBackgrounds();
    }
  }, [open, settings]);

  const loadCustomBackgrounds = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('spotlight-backgrounds')
        .list(user.id);
      
      if (error) throw error;
      
      const backgrounds = data
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('spotlight-backgrounds')
            .getPublicUrl(`${user.id}/${file.name}`);
          return {
            name: file.name,
            url: urlData.publicUrl,
          };
        });
      
      setCustomBackgrounds(backgrounds);
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('spotlight-backgrounds')
        .upload(filePath, file, {
          contentType: file.type,
        });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('spotlight-backgrounds')
        .getPublicUrl(filePath);
      
      setCustomBackgrounds(prev => [...prev, { name: fileName, url: urlData.publicUrl }]);
      setLocalSettings(prev => ({
        ...prev,
        backgroundUrl: urlData.publicUrl,
        backgroundType: 'custom',
      }));
      
      toast({ title: "Background uploaded", description: "Your custom background has been saved." });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: "Could not upload the image.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteBackground = async (name: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.storage
        .from('spotlight-backgrounds')
        .remove([`${user.id}/${name}`]);
      
      if (error) throw error;
      
      setCustomBackgrounds(prev => prev.filter(bg => bg.name !== name));
      
      // Clear selection if deleted background was selected
      const deletedBg = customBackgrounds.find(bg => bg.name === name);
      if (deletedBg && localSettings.backgroundUrl === deletedBg.url) {
        setLocalSettings(prev => ({
          ...prev,
          backgroundUrl: null,
          backgroundType: 'none',
        }));
      }
      
      toast({ title: "Background deleted" });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  const widthLabels = { small: '400px', medium: '600px', large: '800px', full: 'Full Width' };
  const heightLabels = { auto: 'Auto', small: '300px', medium: '450px', large: '600px' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Focus className="h-5 w-5 text-amber-500" />
            Spotlight Settings
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[calc(90vh-140px)]">
          <div className="space-y-6 py-4 pr-4">
            {/* Enable Spotlight */}
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable Spotlight</Label>
                <p className="text-xs text-muted-foreground">
                  Select text to display in a focused popup
                </p>
              </div>
              <Switch
                checked={localSettings.enabled}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {localSettings.enabled && (
              <>
                {/* Mode Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Spotlight Mode</Label>
                  <Tabs
                    value={localSettings.mode}
                    onValueChange={(value) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        mode: value as 'standard' | 'presentation',
                      }))
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="standard">Standard Popup</TabsTrigger>
                      <TabsTrigger value="presentation">Presentation Style</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Auto-close Setting */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-close on New Selection</Label>
                    <p className="text-xs text-muted-foreground">
                      Replace popup content instead of stacking
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.autoClose}
                    onCheckedChange={(checked) =>
                      setLocalSettings((prev) => ({ ...prev, autoClose: checked }))
                    }
                  />
                </div>

                {/* Popup Size */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Popup Size</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Width</span>
                      <span className="text-sm font-medium">{widthLabels[localSettings.popupWidth]}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['small', 'medium', 'large', 'full'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setLocalSettings((prev) => ({ ...prev, popupWidth: size }))}
                          className={`px-3 py-2 text-xs rounded-md border transition-all ${
                            localSettings.popupWidth === size
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Height</span>
                      <span className="text-sm font-medium">{heightLabels[localSettings.popupHeight]}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['auto', 'small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setLocalSettings((prev) => ({ ...prev, popupHeight: size }))}
                          className={`px-3 py-2 text-xs rounded-md border transition-all ${
                            localSettings.popupHeight === size
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background Dimming */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Background Dimming</Label>
                    <span className="text-sm text-muted-foreground">{localSettings.dimLevel}%</span>
                  </div>
                  <Slider
                    value={[localSettings.dimLevel]}
                    onValueChange={([value]) =>
                      setLocalSettings((prev) => ({ ...prev, dimLevel: value }))
                    }
                    min={0}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>None</span>
                    <span>Full</span>
                  </div>
                </div>

                {/* Background Blur */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Background Blur</Label>
                      <p className="text-xs text-muted-foreground">
                        Blur the page behind the spotlight
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.blurBackground}
                      onCheckedChange={(checked) =>
                        setLocalSettings((prev) => ({ ...prev, blurBackground: checked }))
                      }
                    />
                  </div>
                  
                  {localSettings.blurBackground && (
                    <div className="ml-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Blur Amount</span>
                        <span className="text-sm font-medium">{localSettings.blurAmount}px</span>
                      </div>
                      <Slider
                        value={[localSettings.blurAmount]}
                        onValueChange={([value]) =>
                          setLocalSettings((prev) => ({ ...prev, blurAmount: value }))
                        }
                        min={2}
                        max={20}
                        step={1}
                      />
                    </div>
                  )}
                </div>

                {/* Presentation Mode Settings */}
                {localSettings.mode === 'presentation' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Presentation Background</Label>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Text Color</Label>
                        <p className="text-xs text-muted-foreground">
                          Choose based on your background
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLocalSettings((prev) => ({ ...prev, textColor: 'light' }))}
                          className={`px-4 py-2 text-xs rounded-md border transition-all ${
                            localSettings.textColor === 'light'
                              ? 'bg-white text-black border-primary ring-2 ring-primary'
                              : 'bg-white text-black border-border hover:border-muted-foreground'
                          }`}
                        >
                          Light
                        </button>
                        <button
                          onClick={() => setLocalSettings((prev) => ({ ...prev, textColor: 'dark' }))}
                          className={`px-4 py-2 text-xs rounded-md border transition-all ${
                            localSettings.textColor === 'dark'
                              ? 'bg-gray-900 text-white border-primary ring-2 ring-primary'
                              : 'bg-gray-900 text-white border-border hover:border-muted-foreground'
                          }`}
                        >
                          Dark
                        </button>
                      </div>
                    </div>

                    {/* Overlay Darkness */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Overlay Darkness</Label>
                        <span className="text-sm text-muted-foreground">{localSettings.overlayDarkness}%</span>
                      </div>
                      <Slider
                        value={[localSettings.overlayDarkness]}
                        onValueChange={([value]) =>
                          setLocalSettings((prev) => ({ ...prev, overlayDarkness: value }))
                        }
                        min={0}
                        max={80}
                        step={5}
                      />
                    </div>

                    {/* Preset Backgrounds */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Preset Backgrounds</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => setLocalSettings((prev) => ({ 
                            ...prev, 
                            backgroundUrl: null, 
                            backgroundType: 'none' 
                          }))}
                          className={`aspect-video rounded-lg border-2 transition-all flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 ${
                            localSettings.backgroundType === 'none'
                              ? 'ring-2 ring-primary border-primary'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <span className="text-xs text-white font-medium">None</span>
                        </button>
                        {PRESET_BACKGROUNDS.map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => setLocalSettings((prev) => ({
                              ...prev,
                              backgroundUrl: bg.thumbnail,
                              backgroundType: 'preset',
                            }))}
                            className={`aspect-video rounded-lg border-2 overflow-hidden transition-all ${
                              localSettings.backgroundUrl === bg.thumbnail
                                ? 'ring-2 ring-primary border-primary'
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <img
                              src={bg.thumbnail}
                              alt={bg.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Backgrounds */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Custom Backgrounds</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleUpload}
                          className="hidden"
                        />
                      </div>
                      
                      {customBackgrounds.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {customBackgrounds.map((bg) => (
                            <div key={bg.name} className="relative group">
                              <button
                                onClick={() => setLocalSettings((prev) => ({
                                  ...prev,
                                  backgroundUrl: bg.url,
                                  backgroundType: 'custom',
                                }))}
                                className={`aspect-video w-full rounded-lg border-2 overflow-hidden transition-all ${
                                  localSettings.backgroundUrl === bg.url
                                    ? 'ring-2 ring-primary border-primary'
                                    : 'border-border hover:border-muted-foreground'
                                }`}
                              >
                                <img
                                  src={bg.url}
                                  alt="Custom background"
                                  className="w-full h-full object-cover"
                                />
                                {localSettings.backgroundUrl === bg.url && (
                                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <Check className="h-6 w-6 text-white drop-shadow-lg" />
                                  </div>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteBackground(bg.name)}
                                className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                          No custom backgrounds yet. Upload your own images!
                        </p>
                      )}
                    </div>

                    {/* Preview */}
                    <div className="space-y-2 pt-4">
                      <Label className="text-sm font-medium">Preview</Label>
                      <div
                        className="aspect-video rounded-lg overflow-hidden relative flex items-center justify-center"
                        style={{
                          backgroundImage: localSettings.backgroundUrl
                            ? `url(${localSettings.backgroundUrl})`
                            : 'linear-gradient(135deg, #1e293b, #0f172a)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: `rgba(0, 0, 0, ${localSettings.overlayDarkness / 100})`,
                          }}
                        />
                        <p
                          className={`relative z-10 text-lg font-serif italic px-8 text-center ${
                            localSettings.textColor === 'light' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          "This is how your spotlight text will appear..."
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
