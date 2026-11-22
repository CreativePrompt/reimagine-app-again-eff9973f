/**
 * Builds a safe, self-contained HTML excerpt from a reader selection for
 * the audience "Document View". Partial blocks are expanded to whole blocks
 * so the formatting (headings, quote boxes, bold) matches the notes page.
 */
const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre';
const ALLOWED = new Set(['P','H1','H2','H3','H4','H5','H6','LI','UL','OL','BLOCKQUOTE','PRE','STRONG','B','EM','I','U','S','SPAN','BR','SUP','SUB','A','DIV','CODE','MARK']);

function blockOf(node: Node): Element | null {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return el?.closest(BLOCKS) ?? null;
}

export function sanitizeExcerpt(root: HTMLElement): string {
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED.has(child.tagName)) {
        if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','IMG','VIDEO','AUDIO','SVG','BUTTON','INPUT'].includes(child.tagName)) { child.remove(); continue; }
        const frag = document.createDocumentFragment();
        while (child.firstChild) frag.appendChild(child.firstChild);
        child.replaceWith(frag);
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const keep = attr.name === 'class' ? /^ql-/.test(attr.value) : attr.name === 'style' && !/url\(|expression/i.test(attr.value);
        if (attr.name === 'class') {
          const cls = attr.value.split(/\s+/).filter((c) => c.startsWith('ql-')).join(' ');
          if (cls) child.setAttribute('class', cls); else child.removeAttribute('class');
        } else if (!keep) child.removeAttribute(attr.name);
      }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML.trim();
}

export function selectionToDocumentHtml(range: Range): string {
  const startBlock = blockOf(range.startContainer);
  const endBlock = blockOf(range.endContainer);
  const expanded = range.cloneRange();
  if (startBlock) expanded.setStartBefore(startBlock);
  if (endBlock) expanded.setEndAfter(endBlock);
  const holder = document.createElement('div');
  holder.appendChild(expanded.cloneContents());
  return sanitizeExcerpt(holder);
}

export interface DocumentEmphasis { text: string; colorId: string }

/**
 * Wraps each emphasis phrase (matched across inline text nodes, whitespace-
 * insensitive) in a <mark>. Shared by presenter popup and audience so both
 * show identical highlights.
 */
export function applyEmphasisToHtml(html: string, list: DocumentEmphasis[], colorHex: (id: string) => string): string {
  if (!html || list.length === 0) return html;
  const root = document.createElement('div');
  root.innerHTML = html;
  for (const emp of list) {
    const needle = emp.text.replace(/\s+/g, ' ').trim();
    if (!needle) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    // Build a whitespace-normalized string with a map back to (node, offset).
    let flat = '';
    const map: Array<[Text, number]> = [];
    let lastSpace = true;
    for (const t of nodes) {
      const v = t.data;
      for (let i = 0; i < v.length; i++) {
        const isSpace = /\s/.test(v[i]);
        if (isSpace && lastSpace) continue;
        flat += isSpace ? ' ' : v[i];
        map.push([t, i]);
        lastSpace = isSpace;
      }
      if (!lastSpace) { flat += ' '; map.push([t, v.length]); lastSpace = true; }
    }
    const idx = flat.indexOf(needle);
    if (idx < 0) continue;
    const [sNode, sOff] = map[idx];
    const [eNode, eOff] = map[idx + needle.length - 1];
    const range = document.createRange();
    range.setStart(sNode, sOff);
    range.setEnd(eNode, Math.min(eOff + 1, eNode.length));
    // Wrap each text node segment inside the range separately so blocks stay intact.
    const segs = nodes.filter((t) => range.intersectsNode(t));
    for (const t of segs) {
      const start = t === sNode ? sOff : 0;
      const end = t === eNode ? Math.min(eOff + 1, t.length) : t.length;
      if (end <= start) continue;
      const mid = t.splitText(start);
      mid.splitText(end - start);
      const mark = document.createElement('mark');
      mark.setAttribute('data-emphasis', emp.colorId);
      mark.setAttribute('style', `background-color:${colorHex(emp.colorId)};color:inherit;border-radius:3px;padding:0 2px;box-decoration-break:clone;-webkit-box-decoration-break:clone;`);
      mid.parentNode?.insertBefore(mark, mid);
      mark.appendChild(mid);
    }
  }
  return root.innerHTML;
}
