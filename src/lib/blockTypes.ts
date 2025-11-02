export type BlockKind = "point" | "bible" | "illustration" | "application" | "quote" | "media" | "custom" | "reader_note";

export interface BaseBlock {
  id: string;
  kind: BlockKind;
  order: number;
}

export interface PointBlock extends BaseBlock {
  kind: "point";
  title: string;
  body: string;
  number: number | null;
}

export interface BibleBlock extends BaseBlock {
  kind: "bible";
  reference: string;
  text: string;
  translation?: string;
  notes?: string;
}

export interface IllustrationBlock extends BaseBlock {
  kind: "illustration";
  title: string;
  body: string;
}

export interface ApplicationBlock extends BaseBlock {
  kind: "application";
  title: string;
  body: string;
}

export interface QuoteBlock extends BaseBlock {
  kind: "quote";
  text: string;
  author?: string;
  source?: string;
}

export interface MediaBlock extends BaseBlock {
  kind: "media";
  url: string;
  type: "image" | "video" | "audio";
  caption?: string;
}

export interface CustomBlock extends BaseBlock {
  kind: "custom";
  title: string;
  body: string;
}

export interface ReaderNoteBlock extends BaseBlock {
  kind: "reader_note";
  title: string;
  summary: string;
  author?: string;
  source?: string;
}

export type SermonBlock = 
  | PointBlock 
  | BibleBlock 
  | IllustrationBlock 
  | ApplicationBlock 
  | QuoteBlock 
  | MediaBlock 
  | CustomBlock
  | ReaderNoteBlock;

export interface Sermon {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  blocks: SermonBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlockSeed {
  kind: BlockKind;
  title?: string;
  body?: string;
  reference?: string;
  text?: string;
  url?: string;
}

export interface Template {
  key: string;
  name: string;
  description: string;
  blocks: TemplateBlockSeed[];
}
