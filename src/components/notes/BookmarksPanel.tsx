import { useState } from "react";
import { Bookmark, Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { NoteBookmark } from "@/lib/store/notesStore";

export const BOOKMARK_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "rose", label: "Rose", hex: "#b04a4a" },
  { id: "amber", label: "Amber", hex: "#c98a3b" },
  { id: "olive", label: "Olive", hex: "#7d8b3f" },
  { id: "teal", label: "Teal", hex: "#3f7d7a" },
  { id: "navy", label: "Navy", hex: "#3a4a6b" },
  { id: "plum", label: "Plum", hex: "#6b3f5a" },
  { id: "sage", label: "Sage", hex: "#5d7a5a" },
  { id: "slate", label: "Slate", hex: "#5a5a6b" },
];

export function getBookmarkColor(idOrHex: string): string {
  const found = BOOKMARK_COLORS.find((c) => c.id === idOrHex);
  return found ? found.hex : idOrHex;
}

interface BookmarksPanelProps {
  bookmarks: NoteBookmark[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onJump: (bookmarkId: string) => void;
  onUpdate: (bookmarks: NoteBookmark[]) => void;
  onRequestAdd: () => void; // host triggers selection-based add flow
  canAdd: boolean; // true when there is a text selection
}

export function BookmarksPanel({
  bookmarks,
  collapsed,
  onToggleCollapsed,
  onJump,
  onUpdate,
  onRequestAdd,
  canAdd,
}: BookmarksPanelProps) {
  const [editing, setEditing] = useState<NoteBookmark | null>(null);

  const sorted = [...bookmarks].sort((a, b) => a.order - b.order);

  const handleSaveEdit = () => {
    if (!editing) return;
    onUpdate(bookmarks.map((b) => (b.id === editing.id ? editing : b)));
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(bookmarks.filter((b) => b.id !== id));
    setEditing(null);
  };

  if (collapsed) {
    return (
      <div className="w-10 border-r bg-card flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          title="Show bookmarks"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-1.5 mt-1 items-center">
          {sorted.slice(0, 12).map((b) => (
            <button
              key={b.id}
              onClick={() => onJump(b.id)}
              title={b.label}
              className="w-6 h-3 rounded-sm shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: getBookmarkColor(b.color) }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-56 border-r bg-card flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Bookmarks</span>
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

        <div className="p-2 border-b">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onRequestAdd}
            disabled={!canAdd}
            title={canAdd ? "Add bookmark from selected text" : "Select text in the document first"}
          >
            <Plus className="h-3.5 w-3.5" />
            Add bookmark
          </Button>
          {!canAdd && (
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1 leading-tight">
              Select text in the document, then click here.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {sorted.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6 px-2">
              No bookmarks yet. Select text and add one to jump back quickly.
            </div>
          ) : (
            sorted.map((b) => (
              <div
                key={b.id}
                className="group flex items-stretch rounded-md overflow-hidden border bg-background hover:shadow-sm transition-shadow"
              >
                <button
                  onClick={() => onJump(b.id)}
                  className="flex-1 flex items-center gap-2 text-left px-2 py-1.5 min-w-0"
                  title={b.label}
                >
                  <span
                    className="w-1.5 self-stretch rounded-sm shrink-0"
                    style={{ backgroundColor: getBookmarkColor(b.color) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">
                      {b.abbreviation || b.label.slice(0, 4).toUpperCase()}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {b.label}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setEditing(b)}
                  className="px-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit bookmark</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Label</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Bookmark label"
                />
              </div>
              <div>
                <Label className="text-xs">Abbreviation (shown on tab)</Label>
                <Input
                  value={editing.abbreviation || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, abbreviation: e.target.value.slice(0, 6) })
                  }
                  placeholder="e.g. INTRO"
                  maxLength={6}
                />
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

interface AddBookmarkDialogProps {
  open: boolean;
  defaultLabel: string;
  onClose: () => void;
  onConfirm: (label: string, abbreviation: string, color: string) => void;
}

export function AddBookmarkDialog({ open, defaultLabel, onClose, onConfirm }: AddBookmarkDialogProps) {
  const [label, setLabel] = useState("");
  const [abbr, setAbbr] = useState("");
  const [color, setColor] = useState(BOOKMARK_COLORS[0].id);

  // Reset when opened
  if (open && label === "" && defaultLabel) {
    // Initialize once per open — using state init via effect-less pattern:
    setTimeout(() => {
      setLabel(defaultLabel);
      setAbbr(defaultLabel.split(/\s+/).slice(0, 1).join("").slice(0, 5).toUpperCase());
    }, 0);
  }

  const handleConfirm = () => {
    const finalLabel = label.trim() || defaultLabel || "Bookmark";
    const finalAbbr = abbr.trim() || finalLabel.slice(0, 5).toUpperCase();
    onConfirm(finalLabel, finalAbbr, color);
    setLabel("");
    setAbbr("");
    setColor(BOOKMARK_COLORS[0].id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setLabel("");
          setAbbr("");
          setColor(BOOKMARK_COLORS[0].id);
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add bookmark</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What is this bookmark?"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Abbreviation (max 6 chars)</Label>
            <Input
              value={abbr}
              onChange={(e) => setAbbr(e.target.value.slice(0, 6))}
              placeholder="e.g. INTRO"
              maxLength={6}
            />
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
