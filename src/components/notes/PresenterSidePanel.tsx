import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { SpotlightSettings, EMPHASIS_COLORS, FONT_OPTIONS } from "@/components/notes/SpotlightSettingsDialog";
import { parseScriptureFromHighlight, getVerseGroup, getTotalPages, ParsedVerse } from "@/lib/verseParser";

interface EmphasisRange {
  start: number;
  end: number;
  text: string;
  colorId: string;
}

interface PresenterSidePanelProps {
  spotlightText: string;
  spotlightOpen: boolean;
  spotlightSettings: SpotlightSettings;
  emphasisList: EmphasisRange[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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
  audienceCount,
  isLive,
  audienceUrl,
  onCopyUrl,
  onOpenAudienceView,
}: PresenterSidePanelProps) {
  const [copied, setCopied] = useState(false);
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

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

  // Format timer display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  // Get emphasis style classes based on color
  const getEmphasisStyles = (colorId: string, isLight: boolean) => {
    const color = EMPHASIS_COLORS.find(c => c.id === colorId) || EMPHASIS_COLORS[0];
    
    if (spotlightSettings.emphasisStyle === 'highlight') {
      return {
        className: `rounded-sm px-0.5 -mx-0.5 box-decoration-clone ${color.text}`,
        style: { 
          display: 'inline' as const,
          backgroundColor: isLight ? `${color.hex}cc` : color.hex,
        },
      };
    } else {
      return {
        className: ``,
        style: { 
          display: 'inline' as const,
          textDecoration: 'underline',
          textDecorationColor: color.hex,
          textDecorationThickness: '3px',
          textUnderlineOffset: '3px',
        },
      };
    }
  };

  // Render text with emphasis
  const renderTextWithEmphasis = (textContent: string, isLight: boolean) => {
    if (displayEmphasis.length === 0) return textContent;

    const positions: { start: number; end: number; text: string; colorId: string }[] = [];
    displayEmphasis.forEach((emp) => {
      const index = textContent.indexOf(emp.text);
      if (index !== -1) {
        positions.push({ start: index, end: index + emp.text.length, text: emp.text, colorId: emp.colorId });
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
        <span
          key={`emphasis-${idx}`}
          className={emphasisStyle.className}
          style={emphasisStyle.style}
        >
          {pos.text}
        </span>
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
          className="relative h-full rounded-lg overflow-hidden flex items-center justify-center"
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

          {/* Content */}
          <div className="relative z-10 p-4 w-full">
            {displayText ? (
              <div className="text-center">
                {/* Scripture Reference */}
                {parsedScripture && (
                  <div className={`text-xs uppercase tracking-widest font-medium mb-2 ${isLight ? 'text-white/60' : 'text-gray-800/60'}`}>
                    {parsedScripture.reference}
                    {hasMultipleVerses && currentVerses.length > 0 && (
                      <span className="ml-1">
                        (v. {currentVerses[0].verseNumber}
                        {currentVerses.length > 1 && `-${currentVerses[currentVerses.length - 1].verseNumber}`})
                      </span>
                    )}
                  </div>
                )}

                {/* Main Text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayText + displayPage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`leading-relaxed font-bold ${isLight ? 'text-white' : 'text-gray-900'}`}
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

                {/* Pagination */}
                {hasMultipleVerses && calculatedTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPageChange(Math.max(0, displayPage - 1))}
                      disabled={displayPage === 0}
                      className={`h-6 w-6 ${isLight ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-gray-800/60 hover:text-gray-800'}`}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: calculatedTotalPages }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            idx === displayPage
                              ? isLight ? 'bg-white' : 'bg-gray-800'
                              : isLight ? 'bg-white/30' : 'bg-gray-800/30'
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPageChange(Math.min(calculatedTotalPages - 1, displayPage + 1))}
                      disabled={displayPage === calculatedTotalPages - 1}
                      className={`h-6 w-6 ${isLight ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-gray-800/60 hover:text-gray-800'}`}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-center ${isLight ? 'text-white/50' : 'text-gray-800/50'}`}>
                <p className="text-sm">Select text to spotlight</p>
              </div>
            )}
          </div>
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

        {/* Countdown Timer */}
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <div className="text-4xl font-mono text-primary font-bold mb-2">
            {formatTimer(timerSeconds)}
          </div>
          <p className="text-xs text-muted-foreground mb-3">Countdown</p>
          <div className="flex items-center justify-center gap-2">
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
    </div>
  );
}
