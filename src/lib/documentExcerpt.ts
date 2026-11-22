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
