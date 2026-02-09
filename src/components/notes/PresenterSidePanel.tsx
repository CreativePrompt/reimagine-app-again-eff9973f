import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Eye,
  ChevronLeft, 
  ChevronRight,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Users,
  Wifi,
  WifiOff,
  Highlighter,
  Underline,
  Square,
  Minus,
  Plus,
} from "lucide-react";
import { SpotlightSettings, EMPHASIS_COLORS, FONT_OPTIONS } from "@/components/notes/SpotlightSettingsDialog";
import { parseScriptureFromHighlight, getVerseGroup, getTotalPages, ParsedVerse } from "@/lib/verseParser";

interface EmphasisRange {
  start: number;
  end: number;
  text: string;
  colorId: string;
}

interface ColorMenuPosition {
  x: number;
  y: number;
  emphasisIndex: number;
}

type TimerMode = 'stopwatch' | 'countdown';

const QUICK_SET_OPTIONS = [
  { label: '15min', seconds: 15 * 60 },
  { label: '30min', seconds: 30 * 60 },
  { label: '45min', seconds: 45 * 60 },
  { label: '60min', seconds: 60 * 60 },
  { label: '90min', seconds: 90 * 60 },
  { label: '120min', seconds: 120 * 60 },
];

interface PresenterSidePanelProps {
  spotlightText: string;
  spotlightOpen: boolean;
  spotlightSettings: SpotlightSettings;
  emphasisList: EmphasisRange[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEmphasisChange?: (emphasisList: EmphasisRange[]) => void;
  onUpdateSettings?: (settings: SpotlightSettings) => void;
  audienceCount: number;
  isLive: boolean;
  audienceUrl: string;
  onCopyUrl: () => void;
  onOpenAudienceView: () => void;
}

export function PresenterSidePanel({
  spotlightText,
  spotlightOpen,
  spotlightSettings,
  emphasisList,
  currentPage,
  totalPages,
  onPageChange,
  onEmphasisChange,
  onUpdateSettings,
  audienceCount,
  isLive,
  audienceUrl,
  onCopyUrl,
  onOpenAudienceView,
}: PresenterSidePanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  
  // Timer state
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [countdownTarget, setCountdownTarget] = useState(0); // total seconds for countdown
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customMinutes, setCustomMinutes] = useState('30');
  
  // Color menu state
  const [colorMenu, setColorMenu] = useState<ColorMenuPosition | null>(null);
  
  // Mouse tracking for selection vs click
  const isSelectingRef = useRef(false);
  
  // Keep last spotlight text to persist between highlights
  const [lastSpotlightText, setLastSpotlightText] = useState("");
  const [lastEmphasisList, setLastEmphasisList] = useState<EmphasisRange[]>([]);
  const [lastPage, setLastPage] = useState(0);
  const [lastTotalPages, setLastTotalPages] = useState(1);

  // Update last values when spotlight changes
  useEffect(() => {
    if (spotlightText) {
      setLastSpotlightText(spotlightText);
      setLastEmphasisList(emphasisList);
      setLastPage(currentPage);
      setLastTotalPages(totalPages);
    }
  }, [spotlightText, emphasisList, currentPage, totalPages]);

  // Sync page changes
  useEffect(() => {
    if (spotlightText) {
      setLastPage(currentPage);
      setLastTotalPages(totalPages);
    }
  }, [currentPage, totalPages, spotlightText]);

  // Use current or last spotlight content
  const displayText = spotlightText || lastSpotlightText;
  const displayEmphasis = spotlightText ? emphasisList : lastEmphasisList;
  const displayPage = spotlightText ? currentPage : lastPage;
  const displayTotalPages = spotlightText ? totalPages : lastTotalPages;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimerSeconds(prev => prev + 1);
        } else {
          setTimerSeconds(prev => {
            if (prev <= 0) {
              setTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerMode]);

  // Current time effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle copy with feedback
  const handleCopy = useCallback(() => {
    onCopyUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopyUrl]);

  // Handle text selection for emphasis in side panel (matches popup logic)
  const handleTextSelection = useCallback(() => {
    if (!spotlightSettings.liveEmphasisEnabled || !onEmphasisChange) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || !contentRef.current) return;

    const range = selection.getRangeAt(0);
    if (!contentRef.current.contains(range.commonAncestorContainer)) return;

    const defaultColor = EMPHASIS_COLORS.find(c => c.id === spotlightSettings.defaultEmphasisColor)
      ? spotlightSettings.defaultEmphasisColor
      : 'yellow';

    const newEmphasis: EmphasisRange = {
      start: range.startOffset,
      end: range.endOffset,
      text: selectedText,
      colorId: defaultColor,
    };

    if (spotlightSettings.multiEmphasisEnabled) {
      const updated = [...displayEmphasis];
      if (!updated.some(e => e.text === selectedText)) {
        updated.push(newEmphasis);
      }
      onEmphasisChange(updated);
    } else {
      onEmphasisChange([newEmphasis]);
    }

    selection.removeAllRanges();
  }, [spotlightSettings, onEmphasisChange, displayEmphasis]);

  // Mousedown to track selection start
  const handleContentMouseDown = useCallback(() => {
    isSelectingRef.current = false;
  }, []);

  // Mousemove to detect dragging/selection
  const handleContentMouseMove = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      isSelectingRef.current = true;
    }
  }, []);

  // Mouseup to finalize emphasis selection
  const handleContentMouseUp = useCallback(() => {
    setTimeout(handleTextSelection, 10);
  }, [handleTextSelection]);

  // Handle click to clear emphasis (only if not selecting)
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (colorMenu) {
      setColorMenu(null);
      return;
    }
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }
    if (!onEmphasisChange || displayEmphasis.length === 0) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    onEmphasisChange([]);
  }, [onEmphasisChange, displayEmphasis, colorMenu]);

  // Right-click color menu on emphasis
  const handleEmphasisContextMenu = useCallback((e: React.MouseEvent, emphasisIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setColorMenu({
      x: e.clientX,
      y: e.clientY,
      emphasisIndex,
    });
  }, []);

  // Handle color selection from menu
  const handleColorSelect = useCallback((colorId: string) => {
    if (colorMenu === null || !onEmphasisChange) return;
    const updated = displayEmphasis.map((emp, idx) =>
      idx === colorMenu.emphasisIndex ? { ...emp, colorId } : emp
    );
    onEmphasisChange(updated);
    setColorMenu(null);
  }, [colorMenu, onEmphasisChange, displayEmphasis]);

  // Make all same color
  const handleMakeAllSameColor = useCallback((colorId: string) => {
    if (!onEmphasisChange) return;
    onEmphasisChange(displayEmphasis.map(emp => ({ ...emp, colorId })));
    if (onUpdateSettings) {
      onUpdateSettings({ ...spotlightSettings, defaultEmphasisColor: colorId });
    }
    setColorMenu(null);
  }, [onEmphasisChange, displayEmphasis, onUpdateSettings, spotlightSettings]);

  // Close color menu on outside click
  useEffect(() => {
    if (!colorMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && colorMenuRef.current.contains(e.target as Node)) return;
      setColorMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [colorMenu]);

  // Keyboard navigation for pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!displayText) return;
      // Only handle if side panel is focused area (not in an input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' && hasMultipleVerses && displayPage > 0) {
        onPageChange(displayPage - 1);
      } else if (e.key === 'ArrowRight' && hasMultipleVerses && displayPage < calculatedTotalPages - 1) {
        onPageChange(displayPage + 1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [displayText, displayPage]);

  // Format timer display
  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse scripture from the displayed text
  const parsedScripture = useMemo(() => {
    if (!displayText) return null;
    return parseScriptureFromHighlight(displayText);
  }, [displayText]);

  // Check if this is a scripture with multiple verses
  const hasMultipleVerses = parsedScripture && parsedScripture.verses.length > 1;
  const calculatedTotalPages = hasMultipleVerses 
    ? getTotalPages(parsedScripture.verses.length, spotlightSettings.versesPerPage)
    : 1;

  // Get current verses to display
  const currentVerses = useMemo(() => {
    if (!hasMultipleVerses) return [];
    return getVerseGroup(parsedScripture.verses, displayPage, spotlightSettings.versesPerPage);
  }, [parsedScripture, displayPage, spotlightSettings.versesPerPage, hasMultipleVerses]);

  // Get font family based on settings
  const getFontFamily = () => {
    const fontOption = FONT_OPTIONS.find(f => f.id === spotlightSettings.fontOption);
    return fontOption?.fontFamily || 'Georgia, serif';
  };

  // Get emphasis style (matches popup exactly)
  const getEmphasisStyles = (colorId: string, isLight: boolean) => {
    const color = EMPHASIS_COLORS.find(c => c.id === colorId) || EMPHASIS_COLORS[0];
    
    if (spotlightSettings.emphasisStyle === 'highlight') {
      return {
        className: `rounded-sm px-0.5 -mx-0.5 box-decoration-clone cursor-pointer ${color.text}`,
        style: { 
          display: 'inline' as const,
          backgroundColor: isLight ? `${color.hex}cc` : color.hex,
        },
      };
    } else {
      return {
        className: `cursor-pointer`,
        style: { 
          display: 'inline' as const,
          textDecoration: 'underline',
          textDecorationColor: color.hex,
          textDecorationThickness: '4px',
          textUnderlineOffset: '4px',
        },
      };
    }
  };

  // Render text with emphasis (matches popup)
  const renderTextWithEmphasis = (textContent: string, isLight: boolean) => {
    if (displayEmphasis.length === 0) return textContent;

    const positions: { start: number; end: number; text: string; colorId: string; originalIndex: number }[] = [];
    displayEmphasis.forEach((emp, originalIdx) => {
      const index = textContent.indexOf(emp.text);
      if (index !== -1) {
        positions.push({ start: index, end: index + emp.text.length, text: emp.text, colorId: emp.colorId, originalIndex: originalIdx });
      }
    });

    if (positions.length === 0) return textContent;

    positions.sort((a, b) => a.start - b.start);

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    positions.forEach((pos, idx) => {
      if (pos.start > lastEnd) {
        parts.push(textContent.slice(lastEnd, pos.start));
      }
      
      const emphasisStyle = getEmphasisStyles(pos.colorId, isLight);
      
      parts.push(
        <motion.span
          key={`emphasis-${idx}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={emphasisStyle.className}
          style={emphasisStyle.style}
          onContextMenu={(e) => handleEmphasisContextMenu(e, pos.originalIndex)}
        >
          {pos.text}
        </motion.span>
      );
      lastEnd = pos.end;
    });

    if (lastEnd < textContent.length) {
      parts.push(textContent.slice(lastEnd));
    }

    return <>{parts}</>;
  };

  // Format verse text for display
  const formatVerseText = (verse: ParsedVerse, isLight: boolean = true) => {
    const verseText = verse.text;
    
    if (spotlightSettings.showVerseNumbers) {
      return (
        <span>
          <sup className="font-bold mr-1 text-xs opacity-70">{verse.verseNumber}</sup>
          {renderTextWithEmphasis(verseText, isLight)}
        </span>
      );
    }
    return renderTextWithEmphasis(verseText, isLight);
  };

  const isLight = spotlightSettings.textColor === 'light';

  // Timer helpers
  const handleSetCountdown = (seconds: number) => {
    setTimerSeconds(seconds);
    setCountdownTarget(seconds);
    setTimerRunning(false);
  };

  const handleCustomSet = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0) {
      handleSetCountdown(mins * 60);
    }
  };

  const adjustCountdown = (delta: number) => {
    setTimerSeconds(prev => Math.max(0, prev + delta * 60));
  };

  return (
    <div className="h-full flex flex-col bg-card border-l overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Audience View</span>
        </div>
        
        {/* Connection Status */}
        {isLive && (
          <div className="flex items-center gap-2">
            {audienceCount > 0 ? (
              <div className="flex items-center gap-1 text-xs text-primary">
                <Wifi className="h-3 w-3" />
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {audienceCount}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                <span>Waiting...</span>
              </div>
            )}
            <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-semibold rounded">
              Broadcasting content
            </span>
          </div>
        )}
      </div>

      {/* Currently Showing Label */}
      {displayText && parsedScripture && (
        <div className="px-3 py-2 text-center text-xs text-muted-foreground border-b">
          Currently Showing: <span className="font-medium text-foreground">{parsedScripture.reference}</span>
        </div>
      )}

      {/* Spotlight Preview */}
      <div className="flex-1 overflow-hidden p-3">
        <div 
          className="relative h-full rounded-lg overflow-hidden flex flex-col"
          style={{
            backgroundImage: spotlightSettings.backgroundUrl
              ? `url(${spotlightSettings.backgroundUrl})`
              : 'linear-gradient(135deg, #1e3a5f, #0d1f33)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${spotlightSettings.overlayDarkness / 100})`,
            }}
          />

          {/* Scripture Reference Header */}
          {parsedScripture && displayText && (
            <div className="relative z-10 pt-3 px-4">
              <div className={`text-center text-xs uppercase tracking-widest font-medium ${isLight ? 'text-white/60' : 'text-gray-800/60'}`}>
                {parsedScripture.reference}
                {hasMultipleVerses && currentVerses.length > 0 && (
                  <span className="ml-1 normal-case">
                    (v. {currentVerses[0].verseNumber}
                    {currentVerses.length > 1 && `-${currentVerses[currentVerses.length - 1].verseNumber}`})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation Arrows */}
          {hasMultipleVerses && calculatedTotalPages > 1 && (
            <>
              <button
                onClick={() => onPageChange(Math.max(0, displayPage - 1))}
                disabled={displayPage === 0}
                className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full backdrop-blur-sm transition-all ${
                  displayPage === 0 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                } ${
                  isLight
                    ? 'text-white bg-white/10 hover:bg-white/20'
                    : 'text-gray-900 bg-gray-900/10 hover:bg-gray-900/20'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.min(calculatedTotalPages - 1, displayPage + 1))}
                disabled={displayPage === calculatedTotalPages - 1}
                className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full backdrop-blur-sm transition-all ${
                  displayPage === calculatedTotalPages - 1 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                } ${
                  isLight
                    ? 'text-white bg-white/10 hover:bg-white/20'
                    : 'text-gray-900 bg-gray-900/10 hover:bg-gray-900/20'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Content - supports text selection for emphasis */}
          <div
            ref={contentRef}
            className="relative z-10 flex-1 flex items-center justify-center p-4 w-full cursor-text select-text"
            onMouseDown={handleContentMouseDown}
            onMouseMove={handleContentMouseMove}
            onMouseUp={handleContentMouseUp}
            onClick={handleContentClick}
          >
            {displayText ? (
              <div className="text-center w-full">
                {/* Main Text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayText + displayPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`leading-relaxed font-bold italic ${isLight ? 'text-white' : 'text-gray-900'}`}
                    style={{
                      fontFamily: getFontFamily(),
                      fontSize: `${Math.max(0.75, (spotlightSettings.fontSize || 1) * 0.8)}rem`,
                      textShadow: isLight ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {hasMultipleVerses ? (
                      <div className="space-y-1">
                        {currentVerses.map((verse, idx) => (
                          <p key={`verse-${verse.verseNumber}-${idx}`}>
                            {formatVerseText(verse, isLight)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      renderTextWithEmphasis(displayText, isLight)
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <div className={`text-center ${isLight ? 'text-white/50' : 'text-gray-800/50'}`}>
                <p className="text-sm">Select text to spotlight</p>
              </div>
            )}
          </div>

          {/* Pagination dots */}
          {hasMultipleVerses && calculatedTotalPages > 1 && (
            <div className="relative z-10 py-2 flex items-center justify-center gap-2">
              {Array.from({ length: calculatedTotalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onPageChange(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === displayPage
                      ? isLight ? 'bg-white w-4' : 'bg-gray-800 w-4'
                      : isLight ? 'bg-white/30 hover:bg-white/60' : 'bg-gray-800/30 hover:bg-gray-800/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* "This is what your audience sees" label */}
        <p className="text-center text-xs text-muted-foreground mt-2">
          This is what your audience sees
        </p>
      </div>

      {/* Timer Section */}
      <div className="p-3 border-t">
        {/* Current Time */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
          <Clock className="h-4 w-4" />
          <span className="text-lg font-mono">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>

        {/* Timer Display */}
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          {/* Timer with +/- controls for countdown */}
          <div className="flex items-center justify-center gap-3 mb-1">
            {timerMode === 'countdown' && !timerRunning && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => adjustCountdown(-1)}
                disabled={timerSeconds < 60}
                className="h-7 w-7"
              >
                <Minus className="h-3 w-3" />
              </Button>
            )}
            <div className="text-4xl font-mono text-primary font-bold">
              {formatTimer(timerSeconds)}
            </div>
            {timerMode === 'countdown' && !timerRunning && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => adjustCountdown(1)}
                className="h-7 w-7"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {timerMode === 'stopwatch' ? 'Stopwatch Mode' : 'Countdown Mode'}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Button
              variant={timerRunning ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setTimerRunning(!timerRunning)}
              className="gap-1"
            >
              {timerRunning ? (
                <>
                  <Pause className="h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimerSeconds(0);
                setTimerRunning(false);
              }}
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            {timerRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimerRunning(false)}
                className="gap-1 text-destructive border-destructive/30"
              >
                <Square className="h-3 w-3" />
                Stop
              </Button>
            )}
          </div>

          {/* Quick Set (countdown mode) */}
          {timerMode === 'countdown' && !timerRunning && (
            <>
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick Set</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {QUICK_SET_OPTIONS.map((opt) => (
                  <Button
                    key={opt.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetCountdown(opt.seconds)}
                    className="text-xs h-8"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {/* Custom Time */}
              <p className="text-xs font-medium text-muted-foreground mb-2">Custom Time</p>
              <div className="flex items-center gap-2 justify-center">
                <Input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-20 h-8 text-center text-sm"
                  placeholder="min"
                  min={1}
                />
                <Button
                  size="sm"
                  onClick={handleCustomSet}
                  className="h-8"
                >
                  Set
                </Button>
              </div>
            </>
          )}

          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button
              variant={timerMode === 'stopwatch' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTimerMode('stopwatch');
                setTimerSeconds(0);
                setTimerRunning(false);
              }}
              className="text-xs h-7"
            >
              Stopwatch
            </Button>
            <Button
              variant={timerMode === 'countdown' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTimerMode('countdown');
                setTimerSeconds(0);
                setTimerRunning(false);
              }}
              className="text-xs h-7"
            >
              Countdown
            </Button>
          </div>
        </div>
      </div>

      {/* Audience Link Actions */}
      {isLive && (
        <div className="p-3 border-t flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 gap-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAudienceView}
            className="gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </Button>
        </div>
      )}

      {/* Color Selection Context Menu */}
      <AnimatePresence>
        {colorMenu && (
          <motion.div
            ref={colorMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[60] bg-popover border rounded-lg shadow-xl p-3 min-w-[220px]"
            style={{
              left: Math.min(colorMenu.x, window.innerWidth - 240),
              top: Math.min(colorMenu.y, window.innerHeight - 260),
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Emphasis Style Toggle */}
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Emphasis Style</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdateSettings) {
                    onUpdateSettings({ ...spotlightSettings, emphasisStyle: 'highlight' });
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-all ${
                  spotlightSettings.emphasisStyle === 'highlight'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <Highlighter className="h-3.5 w-3.5" />
                Highlight
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdateSettings) {
                    onUpdateSettings({ ...spotlightSettings, emphasisStyle: 'underline' });
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-all ${
                  spotlightSettings.emphasisStyle === 'underline'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <Underline className="h-3.5 w-3.5" />
                Underline
              </button>
            </div>

            <div className="border-t my-2" />
            
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Select Color</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {EMPHASIS_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                    displayEmphasis[colorMenu.emphasisIndex]?.colorId === color.id
                      ? 'ring-2 ring-primary ring-offset-1 border-primary'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
            
            <div className="border-t my-2" />
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Set Default & Apply to All</p>
            <div className="flex flex-wrap gap-2">
              {EMPHASIS_COLORS.map((color) => (
                <button
                  key={`all-${color.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMakeAllSameColor(color.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-5 h-5 rounded-full border transition-all hover:scale-110 ${
                    spotlightSettings.defaultEmphasisColor === color.id
                      ? 'ring-2 ring-primary ring-offset-1 border-primary'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={`Set default to ${color.name}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
