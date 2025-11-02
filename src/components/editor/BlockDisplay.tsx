import { SermonBlock } from "@/lib/blockTypes";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Lightbulb, 
  Target, 
  Quote, 
  Image as ImageIcon, 
  FileText,
  ListOrdered,
  StickyNote
} from "lucide-react";

interface BlockDisplayProps {
  block: SermonBlock;
}

const kindIcons = {
  point: ListOrdered,
  bible: BookOpen,
  illustration: Lightbulb,
  application: Target,
  quote: Quote,
  media: ImageIcon,
  custom: FileText,
  reader_note: StickyNote,
};

const kindColors = {
  point: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  bible: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  illustration: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  application: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  quote: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  media: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  reader_note: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
};

const kindBorderColors = {
  point: "border-l-amber-500",
  bible: "border-l-blue-500",
  illustration: "border-l-yellow-500",
  application: "border-l-green-500",
  quote: "border-l-pink-500",
  media: "border-l-orange-500",
  custom: "border-l-gray-500",
  reader_note: "border-l-indigo-500",
};

export function BlockDisplay({ block }: BlockDisplayProps) {
  const Icon = kindIcons[block.kind];
  const borderColor = kindBorderColors[block.kind];
  
  return (
    <div className={`border-l-4 ${borderColor} pl-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {block.kind === "bible" ? "Bible Passage" : block.kind}
        </span>
      </div>
      
      {block.kind === "point" && (
        <div>
          <h3 className="font-bold text-xl mb-2">
            {block.number !== null && `${block.number}. `}
            {block.title}
          </h3>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.body}</p>
        </div>
      )}
      
      {block.kind === "bible" && (
        <div>
          <h3 className="font-semibold text-lg mb-2">{block.reference}</h3>
          <blockquote className="text-foreground/80 whitespace-pre-wrap italic leading-relaxed">
            "{block.text}"
          </blockquote>
          {block.notes && (
            <p className="text-sm text-muted-foreground mt-3">
              <span className="font-medium">Notes:</span> {block.notes}
            </p>
          )}
        </div>
      )}
      
      {block.kind === "illustration" && (
        <div>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.body}</p>
        </div>
      )}
      
      {block.kind === "application" && (
        <div>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.body}</p>
        </div>
      )}
      
      {block.kind === "quote" && (
        <div>
          <blockquote className="text-foreground/80 italic text-lg leading-relaxed">
            "{block.text}"
          </blockquote>
          {block.author && (
            <p className="text-sm text-muted-foreground mt-2">
              — {block.author}
              {block.source && `, ${block.source}`}
            </p>
          )}
        </div>
      )}
      
      {block.kind === "media" && (
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <ImageIcon className="h-4 w-4" />
            <span className="capitalize">{block.type}</span>
          </div>
          <p className="font-mono text-sm break-all text-foreground/70">{block.url}</p>
          {block.caption && (
            <p className="text-sm text-muted-foreground mt-2">{block.caption}</p>
          )}
        </div>
      )}
      
      {block.kind === "custom" && (
        <div>
          <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.body}</p>
        </div>
      )}
      
      {block.kind === "reader_note" && (
        <div>
          <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.summary}</p>
          {block.author && (
            <p className="text-sm text-muted-foreground mt-3">
              — {block.author}
              {block.source && `, ${block.source}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
