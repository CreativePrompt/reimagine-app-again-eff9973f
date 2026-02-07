// Notes Presentation Channel Utilities
// Handles real-time sync between presenter (NoteEditor) and audience (NotesLiveView)

import { supabase } from "@/integrations/supabase/client";
import { SpotlightSettings } from "@/components/notes/SpotlightSettingsDialog";

export interface NotePresentationState {
  noteId: string;
  noteTitle: string;
  spotlightText: string;
  spotlightOpen: boolean;
  spotlightSettings: SpotlightSettings;
  currentPage: number;
  totalPages: number;
  emphasisList: Array<{
    start: number;
    end: number;
    text: string;
    colorId: string;
  }>;
}

export interface NotePresentationUpdate {
  type: 'spotlight' | 'emphasis' | 'page' | 'settings' | 'clear' | 'init';
  payload: Partial<NotePresentationState>;
}

// Generate a unique session ID for a presentation
export function generateSessionId(): string {
  return `notes-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create a presentation channel
export function createPresentationChannel(sessionId: string) {
  return supabase.channel(`notes-presentation-${sessionId}`, {
    config: {
      broadcast: { self: true }
    }
  });
}

// Broadcast spotlight update to audience
export function broadcastSpotlightUpdate(
  channel: ReturnType<typeof supabase.channel>,
  update: NotePresentationUpdate
) {
  channel.send({
    type: 'broadcast',
    event: 'spotlight-update',
    payload: update
  });
}

// Broadcast full state initialization
export function broadcastInitialState(
  channel: ReturnType<typeof supabase.channel>,
  state: NotePresentationState
) {
  channel.send({
    type: 'broadcast',
    event: 'spotlight-update',
    payload: {
      type: 'init',
      payload: state
    }
  });
}
