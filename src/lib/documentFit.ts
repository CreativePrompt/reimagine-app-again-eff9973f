/** Measure without leaving temporary font sizes in the live presentation DOM. */
export function measureDocumentFit(
  scroller: Pick<HTMLElement, 'clientHeight' | 'scrollHeight'>,
  body: Pick<HTMLElement, 'style'>,
): number {
  const previousFontSize = body.style.fontSize;
  let lo = 1, hi = 4;
  try {
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      body.style.fontSize = `${mid}rem`;
      if (scroller.scrollHeight <= scroller.clientHeight + 1) lo = mid;
      else hi = mid;
    }
    return lo;
  } finally {
    body.style.fontSize = previousFontSize;
  }
}