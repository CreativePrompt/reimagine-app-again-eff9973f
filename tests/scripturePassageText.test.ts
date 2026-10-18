import { expect, test } from 'bun:test';
import { formatScripturePassage } from '../src/lib/scripturePassageText';

test('multi-verse passages keep numbers 1 through 6', () => {
  const passage = 'Ephesians 4:1–6\n\n[1] First. [2] Second.\n[3] Third. [4] Fourth. [5] Fifth. [6] Sixth. (ESV)';
  expect(formatScripturePassage(passage)).toBe('[1] First. [2] Second. [3] Third. [4] Fourth. [5] Fifth. [6] Sixth.');
});