/**
 * Live presentation channel for real-time sermon delivery
 * This would integrate with Supabase Realtime in a full implementation
 */

export interface PresentationSettings {
  bgType: "solid" | "image";
  bgColor: string;
  bgImageDataUrl?: string;
  textColor: "white" | "black";
  uppercase: boolean;
  align: "left" | "center" | "right";
  sizeScale: number;
  showFilmstrip: boolean;
  dimInactive: boolean;
  showWaitingMessage: boolean;
  textBoxPadding: number;
  showTextBox: boolean;
  lineHeight: number;
  wordSpacing: number;
}

export const defaultSettings: PresentationSettings = {
  bgType: "solid",
  bgColor: "#1a1a1a",
  textColor: "white",
  uppercase: false,
  align: "center",
  sizeScale: 1.0,
  showFilmstrip: false,
  dimInactive: false,
  showWaitingMessage: true,
  textBoxPadding: 8,
  showTextBox: true,
  lineHeight: 1.8,
  wordSpacing: 0,
};

export interface Message {
  type: "block" | "line" | "clear" | "settings";
  blockId?: string | null;
  lineIndex?: number | null;
  settings?: PresentationSettings;
  displayMode?: "title" | "content" | "both";
}

export class LiveChannel {
  private sessionId: string;
  private listeners: Set<(message: Message) => void> = new Set();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Send a message to all connected clients
   */
  send(message: Message): void {
    // In a real implementation, this would use Supabase Realtime
    this.listeners.forEach(listener => listener(message));
  }

  /**
   * Subscribe to messages from this channel
   */
  subscribe(callback: (message: Message) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Close the channel
   */
  close(): void {
    this.listeners.clear();
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Create a new live presentation session
 */
export function createLiveSession(): LiveChannel {
  const sessionId = `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return new LiveChannel(sessionId);
}

/**
 * Load presentation settings from localStorage
 */
export function loadSettings(): PresentationSettings {
  if (typeof window === "undefined") return defaultSettings;
  
  try {
    const stored = localStorage.getItem("presentation-settings");
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading presentation settings:", error);
  }
  return defaultSettings;
}

/**
 * Save presentation settings to localStorage
 */
export function saveSettings(settings: PresentationSettings): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("presentation-settings", JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving presentation settings:", error);
  }
}
