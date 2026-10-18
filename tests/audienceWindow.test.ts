import { afterEach, expect, test } from 'bun:test';
import { openAudienceWindow, connectAudienceScreens, DEFAULT_QUICK_LIVE_SETTINGS, selectAudienceScreen, readQuickLiveSettings, saveQuickLiveSettings } from '../src/lib/audienceWindow';

const originalWindow = globalThis.window;
afterEach(() => { globalThis.window = originalWindow; });

test('does not open on the main display before secondary-screen access is ready', () => {
  const calls: string[] = [];
  const primary = { left: 0, top: 0, width: 1280, height: 800, isPrimary: true };
  const secondary = { left: 1280, top: 0, width: 1920, height: 1080 };
  const audience = { closed: false, moveTo: (x: number, y: number) => calls.push(`move:${x},${y}`), resizeTo: (w: number, h: number) => calls.push(`size:${w},${h}`) };
  globalThis.window = {
    location: { origin: 'https://preachery.example' },
    screen: { availWidth: 1280, availHeight: 800 },
    open: (url: string) => { calls.push(`open:${url}`); return audience; },
    getScreenDetails: async () => { calls.push('permission'); return { screens: [primary, secondary], currentScreen: primary }; },
  } as unknown as Window & typeof globalThis;
  const issues: string[] = [];
  expect(openAudienceWindow('/notes/live/test?fullscreen=1', DEFAULT_QUICK_LIVE_SETTINGS, message => issues.push(message))).toBeNull();
  expect(calls).toEqual([]);
  expect(issues.length).toBe(1);
});

test('a blocked popup returns null without requesting screen permission', () => {
  let permissionRequested = false;
  globalThis.window = {
    location: { origin: 'https://preachery.example' },
    screen: { availWidth: 1280, availHeight: 800 }, open: () => null,
    getScreenDetails: async () => { permissionRequested = true; throw new Error('blocked'); },
  } as unknown as Window & typeof globalThis;
  expect(openAudienceWindow('/notes/live/test', { screen: 'current', fullscreen: false })).toBeNull();
  expect(permissionRequested).toBe(false);
});

test('Quick Live defaults to secondary display and fullscreen', () => {
  expect(DEFAULT_QUICK_LIVE_SETTINGS).toEqual({ screen: 'secondary', fullscreen: true });
});

test('matches current display by geometry, not object identity', () => {
  const primary = { left: 0, top: 0, width: 1280, height: 800, isPrimary: true };
  const secondary = { left: -1920, top: 0, width: 1920, height: 1080 };
  expect(selectAudienceScreen({ screens: [primary, secondary], currentScreen: { ...primary } }, 'secondary')).toBe(secondary);
  expect(selectAudienceScreen({ screens: [primary], currentScreen: { ...primary } }, 'secondary')).toBeUndefined();
});

test('authorized secondary geometry and fullscreen are passed in the initial popup call', async () => {
  const primary = { left: 0, top: 0, width: 1280, height: 800, isPrimary: true };
  const secondary = { left: -1920, top: 0, width: 1920, height: 1080, availLeft: -1920, availTop: 24, availWidth: 1920, availHeight: 1056 };
  const opened: Array<{ url: string; name: string; features: string }> = [];
  globalThis.window = {
    location: { origin: 'https://preachery.example' },
    screen: { availWidth: 1280, availHeight: 800 },
    getScreenDetails: async () => ({ screens: [primary, secondary], currentScreen: primary }),
    open: (url: string, name: string, features: string) => { opened.push({ url, name, features }); return { closed: false, moveTo() {}, resizeTo() {}, addEventListener() {} }; },
  } as unknown as Window & typeof globalThis;
  await connectAudienceScreens();
  openAudienceWindow('/notes/live/test', DEFAULT_QUICK_LIVE_SETTINGS);
  expect(opened[0].features).toBe('popup=yes,width=1920,height=1056,left=-1920,top=24,fullscreen=yes');
  expect(opened[0].url).toBe('https://preachery.example/notes/live/test?fullscreen=1&display=-1920%3A0%3A1920%3A1080');
  expect(opened[0].name).toBe('_blank');
  openAudienceWindow('/notes/live/test?fullscreen=1', { screen: 'current', fullscreen: false });
  expect(opened[1].features).toBe('popup=yes,width=1280,height=800,left=0,top=0');
  expect(opened[1].url).toBe('https://preachery.example/notes/live/test?display=0%3A0%3A1280%3A800');
});

test('a disconnected saved display does not silently select another display', () => {
  const primary = { left: 0, top: 0, width: 1280, height: 800, isPrimary: true };
  const secondary = { left: 1280, top: 0, width: 1920, height: 1080 };
  expect(selectAudienceScreen({ screens: [primary, secondary], currentScreen: primary }, 'missing-display')).toBeUndefined();
});

test('a single-screen setup never creates an audience popup for secondary mode', async () => {
  let opened = false;
  const primary = { left: 0, top: 0, width: 1280, height: 800, isPrimary: true };
  globalThis.window = {
    getScreenDetails: async () => ({ screens: [primary], currentScreen: primary }),
    open: () => { opened = true; return null; },
  } as unknown as Window & typeof globalThis;
  await connectAudienceScreens();
  expect(openAudienceWindow('/notes/live/test')).toBeNull();
  expect(opened).toBe(false);
});

test('saves and restores the audience settings', () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map<string, string>();
  globalThis.localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } as unknown as Storage;
  try {
    expect(readQuickLiveSettings()).toEqual({ screen: 'secondary', fullscreen: true });
    saveQuickLiveSettings({ screen: 'current', fullscreen: false });
    expect(readQuickLiveSettings()).toEqual({ screen: 'current', fullscreen: false });
  } finally { globalThis.localStorage = originalStorage; }
});