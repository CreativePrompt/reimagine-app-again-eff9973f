# Project rules

- Notes RichTextEditor is uncontrolled while typing (Quill `defaultValue`); parents push external changes via a separate `editorValue` and read live HTML from a ref — controlled round-trips reset cursor/scroll and re-render the whole page per keystroke.
- Notes editor pastes go through a custom capture-phase handler (`clipboard.convert` + `updateContents`), never Quill 1.x's default paste — the default focuses a hidden element and scrolls the page.
- Programmatic scrolling in notes (bookmark jumps, panel sync) scrolls only the explicit scroll container via `scrollElementInContainer`, never `scrollIntoView` or focusing without `preventScroll` — those cancel each other and bounce the page.
- Bookmark flash in edit mode uses an overlay outside Quill's DOM — adding classes to Quill nodes leaks into saved HTML.
