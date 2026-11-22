import { expect, test } from 'bun:test';
import { measureDocumentFit } from '../src/lib/documentFit';

test('Full size and Compact remeasurement preserve the live zoom font size', () => {
  const body = { style: { fontSize: '6rem' } };
  const scroller = { clientHeight: 1000, get scrollHeight() { return parseFloat(body.style.fontSize) * 200; } };
  const fit = measureDocumentFit(scroller, body as Pick<HTMLElement, 'style'>);
  expect(fit).toBeGreaterThan(3.9);
  expect(body.style.fontSize).toBe('6rem');
  scroller.clientHeight = 500;
  expect(measureDocumentFit(scroller, body as Pick<HTMLElement, 'style'>)).toBeLessThan(2.51);
  expect(body.style.fontSize).toBe('6rem');
});

test('Fit at 100 percent remains unchanged by repeated resize measurement', () => {
  const body = { style: { fontSize: '2rem' } };
  const scroller = { clientHeight: 500, get scrollHeight() { return parseFloat(body.style.fontSize) * 250; } };
  measureDocumentFit(scroller, body as Pick<HTMLElement, 'style'>);
  measureDocumentFit(scroller, body as Pick<HTMLElement, 'style'>);
  expect(body.style.fontSize).toBe('2rem');
});