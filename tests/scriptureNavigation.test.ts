import { expect, test, mock } from 'bun:test';
mock.module('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: async () => ({ data: null, error: null }) } } }));
const { parseReference, getNextVerseCandidates, cleanVerseText } = await import('../src/lib/scriptureNavigation');

test('Matthew 7:12 advances consecutively through verses 13, 14, 15 and 16', () => {
  let reference = 'Matthew 7:12';
  for (const verse of [13, 14, 15, 16]) {
    const parsed = parseReference(reference);
    if (!parsed) throw new Error('Missing reference');
    reference = getNextVerseCandidates(parsed).primary;
    expect(reference).toBe(`Matthew 7:${verse}`);
  }
});
test('John 3:36 provides John 4:1 as the chapter rollover', () => {
  const parsed = parseReference('John 3:36');
  if (!parsed) throw new Error('Missing reference');
  expect(getNextVerseCandidates(parsed).fallback).toBe('John 4:1');
});
test('ranges advance from their final verse', () => {
  const parsed = parseReference('Matthew 7:12–14');
  if (!parsed) throw new Error('Missing reference');
  expect(getNextVerseCandidates(parsed).primary).toBe('Matthew 7:15');
});
test('Next Verse preserves verse 13 while removing the reference header', () => {
  expect(cleanVerseText('Matthew 7:13\n\n[13] Enter by the narrow gate.')).toBe('[13] Enter by the narrow gate.');
});