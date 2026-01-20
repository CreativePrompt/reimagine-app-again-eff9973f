import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightSettings } from "./SpotlightSettingsDialog";
import { parseScriptureFromHighlight, getVerseGroup, getTotalPages, ParsedVerse } from "@/lib/verseParser";

interface SpotlightPopupProps {
  text: string;
  isOpen: boolean;
  onClose: () => void;
  settings: SpotlightSettings;
}

interface EmphasisRange {
  start: number;
  end: number;
  text: string;
}

export function SpotlightPopup({ text, isOpen, onClose, settings }: SpotlightPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [emphasisList, setEmphasisList] = useState<EmphasisRange[]>([]);

  // Parse scripture from the highlighted text
  const parsedScripture = useMemo(() => {
    return parseScriptureFromHighlight(text);
  }, [text]);

  // Check if this is a scripture with multiple verses
  const hasMultipleVerses = parsedScripture && parsedScripture.verses.length > 1;
  const totalPages = hasMultipleVerses 
    ? getTotalPages(parsedScripture.verses.length, settings.versesPerPage)
    : 1;

  // Reset page and emphasis when text changes
  useEffect(() => {
    setCurrentPage(0);
    setEmphasisList([]);
  }, [text]);

  // Get current verses to display
  const currentVerses = useMemo(() => {
    if (!hasMultipleVerses) return [];
    return getVerseGroup(parsedScripture.verses, currentPage, settings.versesPerPage);
  }, [parsedScripture, currentPage, settings.versesPerPage, hasMultipleVerses]);

  // Navigation handlers
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
    setEmphasisList([]);
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
    setEmphasisList([]);
  };

  // Handle text selection for emphasis
  const handleTextSelection = useCallback(() => {
    if (!settings.liveEmphasisEnabled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText && contentRef.current) {
      // Check if selection is within our content area
      const range = selection.getRangeAt(0);
      if (contentRef.current.contains(range.commonAncestorContainer)) {
        const newEmphasis: EmphasisRange = {
          start: range.startOffset,
          end: range.endOffset,
          text: selectedText,
        };

        if (settings.multiEmphasisEnabled) {
          // Add to existing list (avoid duplicates)
          setEmphasisList(prev => {
            const exists = prev.some(e => e.text === selectedText);
            if (exists) return prev;
            return [...prev, newEmphasis];
          });
        } else {
          // Single mode - replace existing
          setEmphasisList([newEmphasis]);
        }
        // Clear the selection to show our custom emphasis
        selection.removeAllRanges();
      }
    }
  }, [settings.liveEmphasisEnabled, settings.multiEmphasisEnabled]);

  // Handle click to clear all emphasis
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Only clear if clicking on the content area, not on navigation
    if (emphasisList.length > 0 && !e.defaultPrevented) {
      setEmphasisList([]);
    }
  }, [emphasisList.length]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Small delay to prevent immediate close from the selection event
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle Esc key and arrow keys for navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (emphasisList.length > 0) {
          setEmphasisList([]);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft" && hasMultipleVerses && currentPage > 0) {
        goToPrevPage();
      } else if (e.key === "ArrowRight" && hasMultipleVerses && currentPage < totalPages - 1) {
        goToNextPage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, hasMultipleVerses, currentPage, totalPages, emphasisList.length]);

  // Add mouseup listener for text selection
  useEffect(() => {
    if (!isOpen || !settings.liveEmphasisEnabled) return;

    const handleMouseUp = () => {
      // Small delay to allow selection to complete
      setTimeout(handleTextSelection, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isOpen, settings.liveEmphasisEnabled, handleTextSelection]);

  // Calculate popup dimensions
  const getPopupWidth = () => {
    switch (settings.popupWidth) {
      case 'small': return 'max-w-md';
      case 'medium': return 'max-w-2xl';
      case 'large': return 'max-w-4xl';
      case 'full': return 'max-w-[95vw]';
      default: return 'max-w-2xl';
    }
  };

  const getPopupHeight = () => {
    switch (settings.popupHeight) {
      case 'small': return 'h-[300px]';
      case 'medium': return 'h-[450px]';
      case 'large': return 'h-[600px]';
      case 'auto':
      default: return 'max-h-[70vh]';
    }
  };

  const isPresentation = settings.mode === 'presentation';

  // Render text with multiple emphasis ranges applied - keeps text inline without layout changes
  const renderTextWithEmphasis = (textContent: string, isLight: boolean) => {
    if (emphasisList.length === 0) return textContent;

    // Use decoration-only styles that don't affect layout
    const emphasisStyles = settings.emphasisStyle === 'highlight'
      ? isLight
        ? 'bg-amber-400/80 text-gray-900 rounded-sm px-0.5 -mx-0.5 box-decoration-clone'
        : 'bg-amber-400 text-gray-900 rounded-sm px-0.5 -mx-0.5 box-decoration-clone'
      : isLight
        ? 'underline decoration-amber-400 decoration-4 underline-offset-4'
        : 'underline decoration-amber-500 decoration-4 underline-offset-4';

    // Find all emphasis positions and sort them
    const positions: { start: number; end: number; text: string }[] = [];
    emphasisList.forEach((emp) => {
      const index = textContent.indexOf(emp.text);
      if (index !== -1) {
        positions.push({ start: index, end: index + emp.text.length, text: emp.text });
      }
    });

    if (positions.length === 0) return textContent;

    // Sort by start position
    positions.sort((a, b) => a.start - b.start);

    // Build the rendered output
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    positions.forEach((pos, idx) => {
      // Add text before this emphasis
      if (pos.start > lastEnd) {
        parts.push(textContent.slice(lastEnd, pos.start));
      }
      // Add the emphasized text
      parts.push(
        <motion.span
          key={`emphasis-${idx}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={emphasisStyles}
          style={{ display: 'inline' }}
        >
          {pos.text}
        </motion.span>
      );
      lastEnd = pos.end;
    });

    // Add remaining text after last emphasis
    if (lastEnd < textContent.length) {
      parts.push(textContent.slice(lastEnd));
    }

    return <>{parts}</>;
  };

  // Format verse text for display with emphasis support
  const formatVerseText = (verse: ParsedVerse, isLight: boolean = true) => {
    const verseText = verse.text;
    
    if (settings.showVerseNumbers) {
      return (
        <span>
          <sup className="font-bold mr-1 text-lg opacity-70">{verse.verseNumber}</sup>
          {renderTextWithEmphasis(verseText, isLight)}
        </span>
      );
    }
    return renderTextWithEmphasis(verseText, isLight);
  };

  // Get the verse range being displayed
  const getDisplayedVerseRange = () => {
    if (!hasMultipleVerses || currentVerses.length === 0) return '';
    const firstVerse = currentVerses[0].verseNumber;
    const lastVerse = currentVerses[currentVerses.length - 1].verseNumber;
    if (firstVerse === lastVerse) return `v. ${firstVerse}`;
    return `vv. ${firstVerse}-${lastVerse}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background Overlay with Dim and Blur - Click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 cursor-pointer"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${settings.dimLevel / 100})`,
              backdropFilter: settings.blurBackground ? `blur(${settings.blurAmount}px)` : 'none',
              WebkitBackdropFilter: settings.blurBackground ? `blur(${settings.blurAmount}px)` : 'none',
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Spotlight Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`fixed inset-0 z-50 flex items-center justify-center`}
            onClick={onClose}
          >
            <div 
              ref={popupRef}
              className={`w-[90%] ${getPopupWidth()}`}
              onClick={(e) => e.stopPropagation()}
            >
            {isPresentation ? (
              /* Presentation Mode */
              <div
                className={`relative rounded-xl overflow-hidden shadow-2xl ${getPopupHeight()} flex flex-col`}
                style={{
                  backgroundImage: settings.backgroundUrl
                    ? `url(${settings.backgroundUrl})`
                    : 'linear-gradient(135deg, #1e3a5f, #0d1f33)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `rgba(0, 0, 0, ${settings.overlayDarkness / 100})`,
                  }}
                />

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className={`absolute top-4 right-4 z-10 h-10 w-10 rounded-full backdrop-blur-sm ${
                    settings.textColor === 'light'
                      ? 'text-white/80 hover:text-white hover:bg-white/20'
                      : 'text-gray-900/80 hover:text-gray-900 hover:bg-gray-900/20'
                  }`}
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Scripture Reference Header */}
                {parsedScripture && (
                  <div className="relative z-[5] pt-6 px-8">
                    <div 
                      className={`text-center ${
                        settings.textColor === 'light' ? 'text-white' : 'text-gray-900'
                      }`}
                      style={{
                        textShadow: settings.textColor === 'light' 
                          ? '0 2px 10px rgba(0,0,0,0.5)' 
                          : '0 2px 10px rgba(255,255,255,0.3)',
                      }}
                    >
                      <h2 className="text-xl md:text-2xl font-bold tracking-wide">
                        {parsedScripture.reference}
                      </h2>
                      {hasMultipleVerses && (
                        <p className="text-sm md:text-base opacity-70 mt-1">
                          {getDisplayedVerseRange()} of {parsedScripture.verses.length} verses
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Arrows */}
                {hasMultipleVerses && totalPages > 1 && (
                  <>
                    {/* Left Arrow */}
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 0}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full backdrop-blur-sm transition-all ${
                        currentPage === 0 
                          ? 'opacity-30 cursor-not-allowed' 
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                      } ${
                        settings.textColor === 'light'
                          ? 'text-white bg-white/10 hover:bg-white/20'
                          : 'text-gray-900 bg-gray-900/10 hover:bg-gray-900/20'
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    {/* Right Arrow */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages - 1}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full backdrop-blur-sm transition-all ${
                        currentPage === totalPages - 1 
                          ? 'opacity-30 cursor-not-allowed' 
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                      } ${
                        settings.textColor === 'light'
                          ? 'text-white bg-white/10 hover:bg-white/20'
                          : 'text-gray-900 bg-gray-900/10 hover:bg-gray-900/20'
                      }`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Content */}
                <div 
                  ref={contentRef}
                  className="relative z-[5] flex-1 flex items-center justify-center p-8 md:p-12 cursor-text select-text"
                  onClick={handleContentClick}
                >
                  <AnimatePresence mode="wait">
                    <motion.blockquote
                      key={hasMultipleVerses ? currentPage : 'single'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`text-2xl md:text-3xl lg:text-4xl leading-relaxed font-serif italic text-center max-w-4xl ${
                        settings.textColor === 'light' ? 'text-white' : 'text-gray-900'
                      }`}
                      style={{
                        textShadow: settings.textColor === 'light' 
                          ? '0 2px 10px rgba(0,0,0,0.5)' 
                          : '0 2px 10px rgba(255,255,255,0.3)',
                      }}
                    >
                      {hasMultipleVerses ? (
                        <div className="space-y-4">
                          {currentVerses.map((verse, idx) => (
                            <p key={verse.verseNumber} className={idx > 0 ? 'mt-4' : ''}>
                              {formatVerseText(verse, settings.textColor === 'light')}
                            </p>
                          ))}
                        </div>
                      ) : (
                        renderTextWithEmphasis(`"${text}"`, settings.textColor === 'light')
                      )}
                    </motion.blockquote>
                  </AnimatePresence>
                </div>

                {/* Footer with pagination indicators */}
                <div className="relative z-[5] py-4">
                  {hasMultipleVerses && totalPages > 1 ? (
                    <div className="flex items-center justify-center gap-2">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentPage
                              ? settings.textColor === 'light' ? 'bg-white w-6' : 'bg-gray-900 w-6'
                              : settings.textColor === 'light' ? 'bg-white/40 hover:bg-white/60' : 'bg-gray-900/40 hover:bg-gray-900/60'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <p
                      className={`text-xs text-center ${
                        settings.textColor === 'light' ? 'text-white/60' : 'text-gray-900/60'
                      }`}
                    >
                      Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Esc</kbd> or click outside to close
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Standard Mode */
              <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {parsedScripture ? parsedScripture.reference : 'Spotlight'}
                    </span>
                    {hasMultipleVerses && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({getDisplayedVerseRange()})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMultipleVerses && totalPages > 1 && (
                      <div className="flex items-center gap-1 mr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={goToPrevPage}
                          disabled={currentPage === 0}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                          {currentPage + 1} / {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages - 1}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="h-8 w-8 rounded-full hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div 
                  className={`p-8 overflow-y-auto cursor-text select-text ${settings.popupHeight !== 'auto' ? getPopupHeight() : 'max-h-[60vh]'}`}
                  onClick={handleContentClick}
                  ref={!isPresentation ? contentRef : undefined}
                >
                  <AnimatePresence mode="wait">
                    <motion.blockquote
                      key={hasMultipleVerses ? currentPage : 'single'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="text-xl md:text-2xl leading-relaxed font-serif italic text-foreground/90 border-l-4 border-amber-400 pl-6"
                    >
                      {hasMultipleVerses ? (
                        <div className="space-y-4">
                          {currentVerses.map((verse, idx) => (
                            <p key={verse.verseNumber} className={idx > 0 ? 'mt-4' : ''}>
                              {formatVerseText(verse, false)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        renderTextWithEmphasis(text, false)
                      )}
                    </motion.blockquote>
                  </AnimatePresence>
                </div>

                {/* Footer hint */}
                <div className="px-6 py-3 border-t bg-muted/30">
                  <p className="text-xs text-muted-foreground text-center">
                    {hasMultipleVerses ? (
                      <>Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">→</kbd> to navigate • <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> to close</>
                    ) : (
                      <>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> or click outside to close</>
                    )}
                  </p>
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
