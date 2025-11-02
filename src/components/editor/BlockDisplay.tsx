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

export function BlockDisplay({ block }: BlockDisplayProps) {
  const Icon = kindIcons[block.kind];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={kindColors[block.kind]}>
          <Icon className="h-3 w-3 mr-1" />
          {block.kind}
        </Badge>
      </div>
      
      {block.kind === "point" && (
        <div>
          <h3 className="font-semibold text-lg">
            {block.number !== null && `${block.number}. `}
            {block.title}
          </h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{block.body}</p>
        </div>
      )}
      
      {block.kind === "bible" && (
        <div>
          <h3 className="font-semibold text-lg">{block.reference}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap italic">"{block.text}"</p>
          {block.translation && (
            <p className="text-sm text-muted-foreground mt-1">— {block.translation}</p>
          )}
          {block.notes && (
            <p className="text-sm text-muted-foreground mt-2">{block.notes}</p>
          )}
        </div>
      )}
      
      {block.kind === "illustration" && (
        <div>
          <h3 className="font-semibold text-lg">{block.title}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{block.body}</p>
        </div>
      )}
      
      {block.kind === "application" && (
        <div>
          <h3 className="font-semibold text-lg">{block.title}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{block.body}</p>
        </div>
      )}
      
      {block.kind === "quote" && (
        <div>
          <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
            "{block.text}"
          </blockquote>
          {block.author && (
            <p className="text-sm text-muted-foreground mt-2">— {block.author}</p>
          )}
          {block.source && (
            <p className="text-xs text-muted-foreground">{block.source}</p>
          )}
        </div>
      )}
      
      {block.kind === "media" && (
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <span>{block.type}</span>
          </div>
          <p className="font-mono text-sm break-all">{block.url}</p>
          {block.caption && (
            <p className="text-sm text-muted-foreground mt-1">{block.caption}</p>
          )}
        </div>
      )}
      
      {block.kind === "custom" && (
        <div>
          <h3 className="font-semibold text-lg">{block.title}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{block.body}</p>
        </div>
      )}
      
      {block.kind === "reader_note" && (
        <div>
          <h3 className="font-semibold text-lg">{block.title}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{block.summary}</p>
          {block.author && (
            <p className="text-sm text-muted-foreground mt-2">— {block.author}</p>
          )}
          {block.source && (
            <p className="text-xs text-muted-foreground">{block.source}</p>
          )}
        </div>
      )}
    </div>
  );
}
