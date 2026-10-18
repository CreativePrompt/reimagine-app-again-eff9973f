interface PresentationScreen {
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary?: boolean;
}

type ScreenWindow = Window & {
  getScreenDetails?: () => Promise<{ screens: PresentationScreen[]; currentScreen: PresentationScreen }>;
};

// Open synchronously from the click, before any permission or network request.
export function openAudienceWindow(url: string): Window | null {
  const audience = window.open(url, 'preachery-notes-audience',
    `popup=yes,width=${window.screen.availWidth},height=${window.screen.availHeight}`);
  if (!audience) return null;
  const host = window as ScreenWindow;
  if (host.getScreenDetails) {
    void host.getScreenDetails().then(({ screens, currentScreen }) => {
      const secondary = screens.find(screen => screen !== currentScreen && !screen.isPrimary)
        ?? screens.find(screen => screen !== currentScreen);
      if (!secondary || audience.closed) return;
      audience.moveTo(secondary.left, secondary.top);
      audience.resizeTo(secondary.width, secondary.height);
    }).catch(() => {
      // The same audience window remains usable if screen permission is denied.
    });
  }
  return audience;
}