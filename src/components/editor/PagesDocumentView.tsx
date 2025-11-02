import { SermonBlock, SermonPage } from "@/lib/blockTypes";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  BookOpen,
  Lightbulb,
  Target,
  Quote as QuoteIcon,
  ListOrdered,
  StickyNote,
} from "lucide-react";

interface PagesDocumentViewProps {
  title: string;
  subtitle?: string;
  blocks: SermonBlock[];
  pages: SermonPage[];
  updatedAt: string;
}

export function PagesDocumentView({
  title,
  subtitle,
  blocks,
  pages,
  updatedAt,
}: PagesDocumentViewProps) {
  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const getBlockBorderColor = (kind: SermonBlock["kind"]) => {
    const colors = {
      point: "border-l-blue-500",
      bible: "border-l-purple-500",
      illustration: "border-l-green-500",
      application: "border-l-orange-500",
      quote: "border-l-pink-500",
      media: "border-l-cyan-500",
      custom: "border-l-gray-500",
      reader_note: "border-l-yellow-500",
    };
    return colors[kind] || "border-l-gray-500";
  };

  const getBlocksForPage = (pageId: string) => {
    return blocks.filter(block => block.pageId === pageId).sort((a, b) => a.order - b.order);
  };

  const unassignedBlocks = blocks.filter(block => !block.pageId).sort((a, b) => a.order - b.order);
  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  const renderBlockContent = (block: SermonBlock) => {
    const borderColor = getBlockBorderColor(block.kind);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`border-l-4 ${borderColor} pl-6 py-4 bg-card/50 rounded-r-lg`}
      >
        {block.kind === "bible" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-500" />
              <span className="font-semibold text-purple-700 dark:text-purple-400">
                {block.reference}
              </span>
              {block.translation && (
                <Badge variant="outline" className="text-xs">
                  {block.translation}
                </Badge>
              )}
            </div>
            <blockquote className="text-lg italic">{block.text}</blockquote>
            {block.notes && (
              <p className="text-sm text-muted-foreground">{block.notes}</p>
            )}
          </div>
        )}

        {block.kind === "point" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-blue-500" />
              <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {block.number && `${block.number}. `}
                {block.title}
              </h3>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {block.body.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {block.kind === "illustration" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-green-500" />
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                {block.title}
              </h3>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {block.body.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {block.kind === "application" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                {block.title}
              </h3>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {block.body.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {block.kind === "quote" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <QuoteIcon className="h-4 w-4 text-pink-500" />
            </div>
            <blockquote className="text-lg italic border-l-4 border-pink-300 pl-4">
              {block.text}
            </blockquote>
            {block.author && (
              <p className="text-sm text-muted-foreground">— {block.author}</p>
            )}
            {block.source && (
              <p className="text-xs text-muted-foreground">{block.source}</p>
            )}
          </div>
        )}

        {block.kind === "reader_note" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                {block.title}
              </h3>
            </div>
            <p className="text-base">{block.summary}</p>
            {block.author && (
              <p className="text-sm text-muted-foreground">Author: {block.author}</p>
            )}
            {block.source && (
              <p className="text-xs text-muted-foreground">Source: {block.source}</p>
            )}
          </div>
        )}

        {block.kind === "custom" && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{block.title}</h3>
            <div className="prose dark:prose-invert max-w-none">
              {block.body.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-5xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xl text-muted-foreground">{subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Updated {formatTimeAgo(updatedAt)}
        </p>
      </div>

      {/* Unassigned Blocks */}
      {unassignedBlocks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-muted-foreground">Unorganized Content</h2>
          {unassignedBlocks.map((block) => (
            <div key={block.id}>{renderBlockContent(block)}</div>
          ))}
        </div>
      )}

      {/* Pages */}
      {sortedPages.map((page) => {
        const pageBlocks = getBlocksForPage(page.id);
        if (pageBlocks.length === 0) return null;

        return (
          <div key={page.id} className="space-y-4">
            <h2 className="text-3xl font-bold border-b pb-2">{page.title}</h2>
            {pageBlocks.map((block) => (
              <div key={block.id}>{renderBlockContent(block)}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
