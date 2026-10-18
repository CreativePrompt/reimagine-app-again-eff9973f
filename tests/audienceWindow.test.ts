import { afterEach, expect, test } from 'bun:test';
import { openAudienceWindow } from '../src/lib/audienceWindow';

const originalWindow = globalThis.window;
afterEach(() => { globalThis.window = originalWindow; });

test('opens audience synchronously before requesting second-screen permission', async () => {
  const calls: string[] = [];
  const primary = { left: 0, top: 0, width: 1280, height: 800, isPrimary: true };
  const secondary = { left: 1280, top: 0, width: 1920, height: 1080 };
  const audience = { closed: false, moveTo: (x: number, y: number) => calls.push(`move:${x},${y}`), resizeTo: (w: number, h: number) => calls.push(`size:${w},${h}`) };
  globalThis.window = {
    screen: { availWidth: 1280, availHeight: 800 },
    open: (url: string) => { calls.push(`open:${url}`); return audience; },
    getScreenDetails: async () => { calls.push('permission'); return { screens: [primary, secondary], currentScreen: primary }; },
  } as unknown as Window & typeof globalThis;
  expect(openAudienceWindow('/notes/live/test?fullscreen=1')).toBe(audience);
  expect(calls.slice(0, 2)).toEqual(['open:/notes/live/test?fullscreen=1', 'permission']);
  await Promise.resolve();
  expect(calls.slice(2)).toEqual(['move:1280,0', 'size:1920,1080']);
});

test('a blocked popup returns null without requesting screen permission', () => {
  let permissionRequested = false;
  globalThis.window = {
    screen: { availWidth: 1280, availHeight: 800 }, open: () => null,
    getScreenDetails: async () => { permissionRequested = true; throw new Error('blocked'); },
  } as unknown as Window & typeof globalThis;
  expect(openAudienceWindow('/notes/live/test')).toBeNull();
  expect(permissionRequested).toBe(false);
});