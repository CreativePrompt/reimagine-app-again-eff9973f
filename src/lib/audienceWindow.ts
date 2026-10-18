export interface PresentationScreen {
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary?: boolean;
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  label?: string;
}

export interface QuickLiveSettings {
  screen: string;
  fullscreen: boolean;
}
export const DEFAULT_QUICK_LIVE_SETTINGS: QuickLiveSettings = { screen: 'secondary', fullscreen: true };
const STORAGE_KEY = 'preachery-quick-live';
type ScreenDetails = { screens: PresentationScreen[]; currentScreen: PresentationScreen };
type ScreenWindow = Window & {
  getScreenDetails?: () => Promise<ScreenDetails>;
};
let cachedDetails: ScreenDetails | undefined;

export function readQuickLiveSettings(): QuickLiveSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { screen: typeof saved.screen === 'string' ? saved.screen : 'secondary', fullscreen: typeof saved.fullscreen === 'boolean' ? saved.fullscreen : true };
  } catch { return { ...DEFAULT_QUICK_LIVE_SETTINGS }; }
}

export function saveQuickLiveSettings(settings: QuickLiveSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Storage may be disabled. */ }
}

export function screenKey(screen: PresentationScreen) {
  return `${screen.left}:${screen.top}:${screen.width}:${screen.height}`;
}

export async function connectAudienceScreens(): Promise<ScreenDetails> {
  const host = window as ScreenWindow;
  if (!host.getScreenDetails) throw new Error('This browser cannot choose a display automatically. Use Chrome or Edge on your desktop.');
  try { cachedDetails = await host.getScreenDetails(); }
  catch {
    throw new Error('Screen access was not allowed. Open the published app directly in Chrome or Edge, allow screen access, then choose Connect displays again.');
  }
  return cachedDetails;
}

// Discover previously authorized displays without prompting on every note opening.
export async function restoreAudienceScreens(): Promise<ScreenDetails | undefined> {
  try {
    if (!navigator.permissions || !(window as ScreenWindow).getScreenDetails) return;
    const permission = await navigator.permissions.query({ name: 'window-management' as PermissionName });
    if (permission.state === 'granted') return await connectAudienceScreens();
  } catch { /* Unsupported permission: setup remains available from the menu. */ }
}

export function selectAudienceScreen(details: ScreenDetails, preference: string): PresentationScreen | undefined {
  if (preference === 'current') return details.currentScreen;
  if (preference !== 'secondary') {
    const chosen = details.screens.find(screen => screenKey(screen) === preference);
    if (chosen) return chosen;
  }
  return details.screens.find(screen => !screen.isPrimary && screenKey(screen) !== screenKey(details.currentScreen))
    ?? details.screens.find(screen => screenKey(screen) !== screenKey(details.currentScreen));
}

// Open synchronously from the click, before any permission or network request.
export function openAudienceWindow(url: string, settings = readQuickLiveSettings(), onIssue?: (message: string) => void): Window | null {
  const target = cachedDetails && selectAudienceScreen(cachedDetails, settings.screen);
  const audienceUrl = new URL(url, window.location.origin || 'http://localhost');
  if (settings.fullscreen) audienceUrl.searchParams.set('fullscreen', '1');
  else audienceUrl.searchParams.delete('fullscreen');
  const features = ['popup=yes',
    `width=${target?.availWidth ?? target?.width ?? window.screen.availWidth}`,
    `height=${target?.availHeight ?? target?.height ?? window.screen.availHeight}`,
    ...(target ? [`left=${target.availLeft ?? target.left}`, `top=${target.availTop ?? target.top}`] : []),
    ...(settings.fullscreen ? ['fullscreen=yes'] : [])].join(',');
  const audience = window.open(audienceUrl.href, 'preachery-notes-audience', features);
  if (!audience) return null;
  const place = (details: ScreenDetails) => {
    const screen = selectAudienceScreen(details, settings.screen);
    if (!screen) { onIssue?.('No secondary display was found. Connect your audience display, then reopen the audience screen.'); return; }
    if (audience.closed) return;
    try {
      audience.moveTo(screen.availLeft ?? screen.left, screen.availTop ?? screen.top);
      audience.resizeTo(screen.availWidth ?? screen.width, screen.availHeight ?? screen.height);
    } catch { onIssue?.('Your browser prevented automatic display placement. Allow screen access in Quick Live settings.'); }
  };
  if (cachedDetails) place(cachedDetails);
  else {
    void connectAudienceScreens().then(details => {
      place(details);
      if (settings.fullscreen) onIssue?.('Screen access is ready. Reopen the audience screen to launch with fullscreen requested from your click.');
    }).catch(error => onIssue?.(error instanceof Error ? error.message : 'Allow screen access in Quick Live settings to use your secondary display.'));
  }
  return audience;
}