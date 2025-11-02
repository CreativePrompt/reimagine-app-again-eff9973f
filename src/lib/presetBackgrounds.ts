import { supabase } from "@/integrations/supabase/client";

export interface PresetBackground {
  id: string;
  name: string;
  thumbnail: string;
  fullPath: string;
}

export const PRESET_BACKGROUNDS: PresetBackground[] = [
  {
    id: "abstract-blue-orange",
    name: "Abstract Blue Orange",
    thumbnail: "/backgrounds/abstract-blue-orange.jpg",
    fullPath: "presets/abstract-blue-orange.jpg",
  },
  {
    id: "mountain-fog",
    name: "Mountain Fog",
    thumbnail: "/backgrounds/mountain-fog.jpg",
    fullPath: "presets/mountain-fog.jpg",
  },
  {
    id: "snowy-mountains",
    name: "Snowy Mountains",
    thumbnail: "/backgrounds/snowy-mountains.jpg",
    fullPath: "presets/snowy-mountains.jpg",
  },
  {
    id: "coastal-cliffs",
    name: "Coastal Cliffs",
    thumbnail: "/backgrounds/coastal-cliffs.jpg",
    fullPath: "presets/coastal-cliffs.jpg",
  },
  {
    id: "gradient-colorful",
    name: "Colorful Gradient",
    thumbnail: "/backgrounds/gradient-colorful.jpg",
    fullPath: "presets/gradient-colorful.jpg",
  },
  {
    id: "gradient-warm",
    name: "Warm Gradient",
    thumbnail: "/backgrounds/gradient-warm.jpg",
    fullPath: "presets/gradient-warm.jpg",
  },
  {
    id: "hills-sunrise",
    name: "Hills Sunrise",
    thumbnail: "/backgrounds/hills-sunrise.jpg",
    fullPath: "presets/hills-sunrise.jpg",
  },
];

/**
 * Get the public URL for a preset background from Supabase Storage
 */
export async function getPresetBackgroundUrl(fullPath: string): Promise<string> {
  const { data } = supabase.storage
    .from("presentation-backgrounds")
    .getPublicUrl(fullPath);
  
  return data.publicUrl;
}

/**
 * Initialize preset backgrounds by uploading them to Supabase Storage
 * This should be called once during app initialization
 */
export async function initializePresetBackgrounds(): Promise<void> {
  try {
    // Check if presets are already uploaded
    const { data: existingFiles } = await supabase.storage
      .from("presentation-backgrounds")
      .list("presets");

    if (existingFiles && existingFiles.length > 0) {
      console.log("Preset backgrounds already initialized");
      return;
    }

    // Upload each preset background
    for (const preset of PRESET_BACKGROUNDS) {
      try {
        const response = await fetch(preset.thumbnail);
        const blob = await response.blob();
        
        const { error } = await supabase.storage
          .from("presentation-backgrounds")
          .upload(preset.fullPath, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (error) {
          console.error(`Error uploading ${preset.name}:`, error);
        } else {
          console.log(`Uploaded ${preset.name}`);
        }
      } catch (error) {
        console.error(`Failed to upload ${preset.name}:`, error);
      }
    }
  } catch (error) {
    console.error("Error initializing preset backgrounds:", error);
  }
}

/**
 * Convert a file to base64 data URL for storage in settings
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Load an image URL and convert it to base64 data URL
 */
export async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
