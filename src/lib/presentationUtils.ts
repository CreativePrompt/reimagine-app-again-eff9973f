import { SermonBlock } from "./blockTypes";

/**
 * Extracts just the title/heading from a sermon block
 */
export function extractBlockTitle(block: SermonBlock): string {
  switch (block.kind) {
    case "bible":
      return block.reference ? `${block.reference} (${block.translation || "ESV"})` : "";
    case "point":
      return block.number !== null && block.number !== undefined
        ? `${block.number}. ${block.title}`
        : block.title;
    case "illustration":
      return block.title;
    case "application":
      return block.title;
    case "quote":
      return block.author ? `Quote from ${block.author}` : "Quote";
    case "reader_note":
      return block.title;
    case "media":
      return block.caption || "Media";
    case "custom":
      return block.title;
  }
  return "";
}

/**
 * Extracts just the body/content from a sermon block (without title)
 */
export function extractBlockContent(block: SermonBlock): string[] {
  const lines: string[] = [];

  switch (block.kind) {
    case "bible":
      if (block.text) lines.push(block.text);
      break;
    case "point":
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;
    case "illustration":
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;
    case "application":
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;
    case "quote":
      if (block.text) lines.push(block.text);
      if (block.author || block.source) {
        const attribution = [block.author, block.source].filter(Boolean).join(", ");
        lines.push(`— ${attribution}`);
      }
      break;
    case "reader_note":
      if (block.summary) {
        const paragraphs = block.summary.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;
    case "media":
      if (block.url) lines.push(`Media: ${block.url}`);
      break;
    case "custom":
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;
  }

  return lines.filter(line => line.trim().length > 0);
}

/**
 * Extracts text lines from a sermon block for presentation mode
 */
export function extractTextLines(block: SermonBlock): string[] {
  const lines: string[] = [];

  switch (block.kind) {
    case "bible":
      if (block.reference) {
        lines.push(`${block.reference} (${block.translation || "ESV"})`);
      }
      if (block.text) {
        lines.push(block.text);
      }
      break;

    case "point":
      const pointTitle = block.number !== null && block.number !== undefined
        ? `${block.number}. ${block.title}`
        : block.title;
      if (pointTitle) lines.push(pointTitle);
      if (block.body) {
        // Split body into paragraphs
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;

    case "illustration":
      if (block.title) lines.push(block.title);
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;

    case "application":
      if (block.title) lines.push(block.title);
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;

    case "quote":
      if (block.text) lines.push(block.text);
      if (block.author || block.source) {
        const attribution = [block.author, block.source].filter(Boolean).join(", ");
        lines.push(`— ${attribution}`);
      }
      break;

    case "reader_note":
      if (block.title) lines.push(block.title);
      if (block.summary) {
        const paragraphs = block.summary.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;

    case "media":
      if (block.caption) lines.push(block.caption);
      if (block.url) lines.push(`Media: ${block.url}`);
      break;

    case "custom":
      if (block.title) lines.push(block.title);
      if (block.body) {
        const paragraphs = block.body.split("\n\n").filter(p => p.trim());
        lines.push(...paragraphs);
      }
      break;
  }

  return lines.filter(line => line.trim().length > 0);
}
