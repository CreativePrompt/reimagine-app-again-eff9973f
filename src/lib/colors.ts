import { BlockKind } from "./blockTypes";

export function getBlockColor(kind: BlockKind): string {
  switch (kind) {
    case "bible":
      return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
    case "point":
      return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";
    case "illustration":
      return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
    case "application":
      return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950";
    case "quote":
      return "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950";
    case "custom":
      return "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900";
    case "media":
      return "border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950";
    case "reader_note":
      return "border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950";
    default:
      return "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900";
  }
}

export function getBlockIcon(kind: BlockKind): string {
  switch (kind) {
    case "bible":
      return "📖";
    case "point":
      return "📝";
    case "illustration":
      return "💡";
    case "application":
      return "✅";
    case "quote":
      return "💬";
    case "custom":
      return "📄";
    case "media":
      return "🎬";
    case "reader_note":
      return "📋";
    default:
      return "📄";
  }
}
