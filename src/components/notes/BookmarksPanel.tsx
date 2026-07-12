import { useState, useEffect, useMemo, useRef } from "react";
import {
  Bookmark,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NoteBookmark } from "@/lib/store/notesStore";

export const BOOKMARK_COLORS: {
  id: string;
  label: string;
  hex: string;
  tint: string;
  text: string;
}[] = [
  { id: "blue",   label: "Blue",   hex: "#2563eb", tint: "#dbeafe", text: "#1d4ed8" },
  { id: "purple", label: "Purple", hex: "#7c3aed", tint: "#ede9fe", text: "#6d28d9" },
  { id: "green",  label: "Green",  hex: "#16a34a", tint: "#dcfce7", text: "#15803d" },
  { id: "orange", label: "Orange", hex: "#ea580c", tint: "#ffedd5", text: "#c2410c" },
  { id: "red",    label: "Red",    hex: "#dc2626", tint: "#fee2e2", text: "#b91c1c" },
  { id: "teal",   label: "Teal",   hex: "#0d9488", tint: "#ccfbf1", text: "#0f766e" },
  { id: "amber",  label: "Amber",  hex: "#d97706", tint: "#fef3c7", text: "#b45309" },
  { id: "pink",   label: "Pink",   hex: "#db2777", tint: "#fce7f3", text: "#be185d" },
  { id: "slate",  label: "Slate",  hex: "#475569", tint: "#e2e8f0", text: "#334155" },
];

const DEFAULT_ROTATION = ["blue", "purple", "green", "orange", "red", "teal", "amber", "pink"];

export function getBookmarkColor(idOrHex: string) {
  const found = BOOKMARK_COLORS.find((c) => c.id === idOrHex);
  if (found) return found;
  // Legacy hex — return a synthesized entry
  return { id: idOrHex, label: "", hex: idOrHex, tint: idOrHex + "22", text: idOrHex };
}

function toRoman(num: number): string {
  if (num <= 0) return "";
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) { out += s; n -= v; }
  }
  return out;
}

interface BookmarksPanelProps {
  bookmarks: NoteBookmark[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onJump: (bookmarkId: string) => void;
  onUpdate: (bookmarks: NoteBookmark[]) => void;
  onRequestAdd: () => void;
  canAdd: boolean;
  /** Currently active bookmark id (based on scroll position). */
  activeId?: string | null;
  /** Overall document read progress (0-100). */
  progress?: number;
}

export function BookmarksPanel({
  bookmarks,
  collapsed,
  onToggleCollapsed,
  onJump,
  onUpdate,
  onRequestAdd,
  canAdd,
  activeId,
  progress = 0,
}: BookmarksPanelProps) {
  const [editing, setEditing] = useState<NoteBookmark | null>(null);
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const activeRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...bookmarks].sort((a, b) => a.order - b.order),
    [bookmarks]
  );

  // Group top-level (level 1 or undefined) with following level>=2 children
  const groups = useMemo(() => {
    const g: { parent: NoteBookmark; children: NoteBookmark[] }[] = [];
    let current: { parent: NoteBookmark; children: NoteBookmark[] } | null = null;
    for (const b of sorted) {
      const level = b.level ?? 1;
      if (level <= 1 || !current) {
        current = { parent: b, children: [] };
        g.push(current);
      } else {
        current.children.push(b);
      }
    }
    return g;
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(({ parent, children }) => {
        const matchParent =
          parent.label.toLowerCase().includes(q) ||
          (parent.subtitle || "").toLowerCase().includes(q);
        const matchChildren = children.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            (c.subtitle || "").toLowerCase().includes(q)
        );
        if (matchParent || matchChildren.length) {
          return { parent, children: matchParent ? children : matchChildren };
        }
        return null;
      })
      .filter(Boolean) as { parent: NoteBookmark; children: NoteBookmark[] }[];
  }, [groups, query]);

  // Auto-scroll active into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeId]);

  const handleSaveEdit = () => {
    if (!editing) return;
    onUpdate(bookmarks.map((b) => (b.id === editing.id ? editing : b)));
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(bookmarks.filter((b) => b.id !== id));
    setEditing(null);
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeIndex = sorted.findIndex((b) => b.id === activeId);

  if (collapsed) {
    return (
      <div className="w-11 border-r bg-card flex flex-col items-center py-3 gap-2 sticky top-0 h-screen">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          title="Show bookmarks"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-1.5 mt-1 items-center w-full px-1.5">
          {sorted.slice(0, 16).map((b) => {
            const c = getBookmarkColor(b.color);
            const isActive = b.id === activeId;
            return (
              <button
                key={b.id}
                onClick={() => onJump(b.id)}
                title={b.label}
                className={cn(
                  "w-full h-6 rounded-md shadow-sm flex items-center justify-center text-[9px] font-bold transition-transform hover:scale-105",
                  isActive && "ring-2 ring-primary"
                )}
                style={{ backgroundColor: c.tint, color: c.text }}
              >
                {toRoman((b.order ?? 0) + 1)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="w-72 border-r bg-card flex flex-col sticky top-0 h-screen">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bookmark className="h-4 w-4 text-primary" fill="currentColor" />
            </div>
            <div>
              <div className="font-semibold text-[15px] leading-tight">Bookmarks</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {sorted.length} {sorted.length === 1 ? "section" : "sections"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            title="Collapse"
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Add + search */}
        <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
          <Button
            size="sm"
            className="w-full justify-center gap-2 h-9 font-medium"
            onClick={onRequestAdd}
            disabled={!canAdd}
            title={canAdd ? "Add bookmark from selected text" : "Select text in the document first"}
          >
            <Plus className="h-4 w-4" />
            Add Bookmark
          </Button>
          {!canAdd && (
            <p className="text-[10px] text-muted-foreground px-1 leading-tight">
              Select text in the document, then click here.
            </p>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headings..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-10 px-3">
              {query
                ? "No bookmarks match your search."
                : "No bookmarks yet. Select text in the document and add one to jump back quickly."}
            </div>
          ) : (
            filtered.map(({ parent, children }, idx) => (
              <BookmarkGroup
                key={parent.id}
                parent={parent}
                children={children}
                index={idx}
                activeId={activeId ?? null}
                activeRef={activeRef}
                collapsed={collapsedGroups.has(parent.id)}
                onToggle={() => toggleGroup(parent.id)}
                onJump={onJump}
                onEdit={setEditing}
              />
            ))
          )}
        </div>

        {/* Progress */}
        {sorted.length > 0 && (
          <div className="border-t px-4 py-3 shrink-0 bg-muted/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Document Progress
              </span>
              <span className="text-[11px] font-semibold text-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            {activeIndex >= 0 && (
              <div className="text-[10px] text-muted-foreground mt-1.5">
                Section {activeIndex + 1} of {sorted.length}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit bookmark</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Heading</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Section heading"
                />
              </div>
              <div>
                <Label className="text-xs">Subtitle (preview)</Label>
                <Input
                  value={editing.subtitle || ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  placeholder="Short description shown under heading"
                />
              </div>
              <div>
                <Label className="text-xs">Indent level</Label>
                <div className="flex gap-1.5 mt-1.5">
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setEditing({ ...editing, level: lvl })}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        (editing.level ?? 1) === lvl
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {lvl === 1 ? "Top level" : `Level ${lvl}`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {BOOKMARK_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setEditing({ ...editing, color: c.id })}
                      className={cn(
                        "h-7 w-7 rounded-md border-2 transition-transform hover:scale-110",
                        editing.color === c.id ? "border-primary scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => editing && handleDelete(editing.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────── One bookmark group (parent + children) ─────────── */

function BookmarkGroup({
  parent,
  children,
  index,
  activeId,
  activeRef,
  collapsed,
  onToggle,
  onJump,
  onEdit,
}: {
  parent: NoteBookmark;
  children: NoteBookmark[];
  index: number;
  activeId: string | null;
  activeRef: React.RefObject<HTMLDivElement>;
  collapsed: boolean;
  onToggle: () => void;
  onJump: (id: string) => void;
  onEdit: (b: NoteBookmark) => void;
}) {
  const hasChildren = children.length > 0;
  return (
    <div>
      <BookmarkRow
        bookmark={parent}
        romanIndex={index + 1}
        isActive={parent.id === activeId}
        activeRef={parent.id === activeId ? activeRef : undefined}
        onJump={onJump}
        onEdit={onEdit}
        onToggleGroup={hasChildren ? onToggle : undefined}
        groupCollapsed={collapsed}
      />
      {hasChildren && !collapsed && (
        <div className="mt-1 ml-4 pl-2 border-l border-border/60 space-y-1">
          {children.map((child) => (
            <BookmarkRow
              key={child.id}
              bookmark={child}
              romanIndex={0}
              isChild
              isActive={child.id === activeId}
              activeRef={child.id === activeId ? activeRef : undefined}
              onJump={onJump}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── One row ─────────── */

function BookmarkRow({
  bookmark,
  romanIndex,
  isChild = false,
  isActive,
  activeRef,
  onJump,
  onEdit,
  onToggleGroup,
  groupCollapsed,
}: {
  bookmark: NoteBookmark;
  romanIndex: number;
  isChild?: boolean;
  isActive: boolean;
  activeRef?: React.RefObject<HTMLDivElement>;
  onJump: (id: string) => void;
  onEdit: (b: NoteBookmark) => void;
  onToggleGroup?: () => void;
  groupCollapsed?: boolean;
}) {
  const c = getBookmarkColor(bookmark.color);
  const subtitle = bookmark.subtitle || bookmark.snippet || "";

  return (
    <div
      ref={activeRef}
      className={cn(
        "group relative flex items-stretch rounded-lg overflow-hidden border transition-all cursor-pointer",
        isActive
          ? "bg-primary/5 border-primary/40 shadow-sm"
          : "bg-background border-transparent hover:bg-muted/60 hover:border-border"
      )}
      onClick={() => onJump(bookmark.id)}
    >
      {/* Color strip */}
      <div
        className={cn(
          "shrink-0 self-stretch transition-all",
          isChild ? "w-1" : "w-1.5",
          isActive && "w-1.5"
        )}
        style={{ backgroundColor: c.hex, opacity: isActive ? 1 : 0.75 }}
      />

      {/* Content */}
      <div
        className={cn(
          "flex-1 flex items-center gap-2.5 min-w-0",
          isChild ? "py-2 px-2" : "py-2.5 px-2.5"
        )}
      >
        {!isChild && (
          <div
            className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold tracking-tight"
            style={{ backgroundColor: c.tint, color: c.text }}
          >
            {toRoman(romanIndex)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "font-semibold leading-snug truncate",
              isChild ? "text-[13px]" : "text-[15px]",
              isActive ? "text-primary" : "text-foreground"
            )}
            title={bookmark.label}
          >
            {bookmark.label}
          </div>
          {subtitle && (
            <div
              className={cn(
                "text-[12px] text-muted-foreground truncate leading-snug",
                isChild && "text-[11px]"
              )}
              title={subtitle}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Group collapse chevron */}
        {onToggleGroup && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleGroup();
            }}
            className="shrink-0 h-6 w-6 rounded hover:bg-muted flex items-center justify-center opacity-60 hover:opacity-100"
            title={groupCollapsed ? "Expand" : "Collapse"}
          >
            {groupCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 h-6 w-6 rounded hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="More"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(bookmark)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onJump(bookmark.id)}>
              <ChevronRight className="h-3.5 w-3.5 mr-2" />
              Jump to
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ─────────── Add dialog ─────────── */

interface AddBookmarkDialogProps {
  open: boolean;
  defaultLabel: string;
  defaultColor?: string;
  onClose: () => void;
  onConfirm: (label: string, abbreviation: string, color: string, subtitle: string, level: number) => void;
}

export function AddBookmarkDialog({
  open,
  defaultLabel,
  defaultColor,
  onClose,
  onConfirm,
}: AddBookmarkDialogProps) {
  const [label, setLabel] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [abbr, setAbbr] = useState("");
  const [color, setColor] = useState(BOOKMARK_COLORS[0].id);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (open) {
      setLabel(defaultLabel);
      setSubtitle("");
      setAbbr(defaultLabel.split(/\s+/).slice(0, 1).join("").slice(0, 5).toUpperCase());
      setColor(defaultColor || BOOKMARK_COLORS[0].id);
      setLevel(1);
    }
  }, [open, defaultLabel, defaultColor]);

  const handleConfirm = () => {
    const finalLabel = label.trim() || defaultLabel || "Bookmark";
    const finalAbbr = abbr.trim() || finalLabel.slice(0, 5).toUpperCase();
    onConfirm(finalLabel, finalAbbr, color, subtitle.trim(), level);
    setLabel("");
    setSubtitle("");
    setAbbr("");
    setColor(BOOKMARK_COLORS[0].id);
    setLevel(1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setLabel("");
          setSubtitle("");
          setAbbr("");
          setColor(BOOKMARK_COLORS[0].id);
          setLevel(1);
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add bookmark</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Heading</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. VI. The Christian Response"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Subtitle (preview)</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div>
            <Label className="text-xs">Indent level</Label>
            <div className="flex gap-1.5 mt-1.5">
              {[1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    level === lvl
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {lvl === 1 ? "Top level" : `Level ${lvl}`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {BOOKMARK_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "h-7 w-7 rounded-md border-2 transition-transform hover:scale-110",
                    color === c.id ? "border-primary scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Add bookmark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pick a rotating default color based on how many bookmarks exist. */
export function pickDefaultBookmarkColor(existingCount: number): string {
  return DEFAULT_ROTATION[existingCount % DEFAULT_ROTATION.length];
}
