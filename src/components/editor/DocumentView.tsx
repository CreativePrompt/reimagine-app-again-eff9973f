import { SermonBlock } from "@/lib/blockTypes";
import { motion } from "framer-motion";

interface DocumentViewProps {
  title: string;
  subtitle?: string;
  blocks: SermonBlock[];
  updatedAt: string;
}

export function DocumentView({ title, subtitle, blocks, updatedAt }: DocumentViewProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `Updated ${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Updated ${diffHours} hours ago`;
    return `Updated ${Math.floor(diffHours / 24)} days ago`;
  };

  const getBlockBorderColor = (kind: string) => {
    const colors: Record<string, string> = {
      bible: "border-l-blue-500",
      point: "border-l-amber-500",
      illustration: "border-l-yellow-500",
      application: "border-l-green-500",
      quote: "border-l-pink-500",
      media: "border-l-orange-500",
      custom: "border-l-gray-500",
      reader_note: "border-l-indigo-500",
    };
    return colors[kind] || "border-l-gray-500";
  };

  const renderBlockContent = (block: SermonBlock) => {
    switch (block.kind) {
      case "bible":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-l-4 ${getBlockBorderColor(block.kind)} pl-6 py-4 mb-8`}
          >
            <h3 className="font-semibold text-lg mb-3">{block.reference}</h3>
            <blockquote className="italic text-foreground/90 text-base leading-relaxed mb-3">
              "{block.text}"
            </blockquote>
            {block.notes && (
              <p className="text-sm text-muted-foreground mt-3">
                <span className="font-medium">Notes:</span> {block.notes}
              </p>
            )}
          </motion.div>
        );

      case "point":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4">
              {block.number !== null && `${block.number}. `}
              {block.title}
            </h2>
            <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {block.body}
            </p>
          </motion.div>
        );

      case "illustration":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-l-4 ${getBlockBorderColor(block.kind)} pl-6 py-4 mb-8 bg-yellow-50/50 dark:bg-yellow-950/20`}
          >
            <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {block.body}
            </p>
          </motion.div>
        );

      case "application":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-l-4 ${getBlockBorderColor(block.kind)} pl-6 py-4 mb-8 bg-green-50/50 dark:bg-green-950/20`}
          >
            <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {block.body}
            </p>
          </motion.div>
        );

      case "quote":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <blockquote className="italic text-lg text-foreground/90 pl-6 border-l-4 border-l-pink-500">
              "{block.text}"
            </blockquote>
            {block.author && (
              <p className="text-sm text-muted-foreground mt-2 pl-6">
                — {block.author}
                {block.source && `, ${block.source}`}
              </p>
            )}
          </motion.div>
        );

      case "reader_note":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-l-4 ${getBlockBorderColor(block.kind)} pl-6 py-4 mb-8 bg-indigo-50/50 dark:bg-indigo-950/20`}
          >
            <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
            <div className="space-y-3">
              {block.summaries.map((summary, index) => (
                <p key={`summary-${index}`} className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap pl-3 border-l-2 border-muted">
                  {summary}
                </p>
              ))}
            </div>
            {block.author && (
              <p className="text-sm text-muted-foreground mt-3">
                — {block.author}
                {block.source && `, ${block.source}`}
              </p>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 pb-8 border-b"
      >
        <h1 className="text-4xl font-bold mb-3">{title}</h1>
        {subtitle && (
          <p className="text-xl text-muted-foreground mb-3">{subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground">{formatTimeAgo(updatedAt)}</p>
      </motion.div>

      <div className="space-y-2">
        {blocks.map((block, index) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            {renderBlockContent(block)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
