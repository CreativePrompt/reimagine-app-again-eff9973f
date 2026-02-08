import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { NotePresentationState, NotePresentationUpdate } from "@/lib/notesPresentation";
import { SpotlightSettings, EMPHASIS_COLORS, FONT_OPTIONS, DEFAULT_SPOTLIGHT_SETTINGS } from "@/components/notes/SpotlightSettingsDialog";
import { parseScriptureFromHighlight, getVerseGroup, getTotalPages, ParsedVerse } from "@/lib/verseParser";

export default function NotesLiveView() {
  const { sessionId } = useParams();
  const [state, setState] = useState<NotePresentationState | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Keep last spotlight content to persist between highlights
  const [lastSpotlight, setLastSpotlight] = useState<{
    text: string;
    settings: SpotlightSettings;
    emphasisList: Array<{ start: number; end: number; text: string; colorId: string }>;
    currentPage: number;
    totalPages: number;
  } | null>(null);

  // Connect to realtime channel
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`notes-presentation-${sessionId}`, {
      config: {
        broadcast: { self: true }
      }
    });

    channel
      .on('broadcast', { event: 'spotlight-update' }, (payload) => {
        const update = payload.payload as NotePresentationUpdate;
        
        if (update.type === 'init') {
          setState(update.payload as NotePresentationState);
          // Save last spotlight if there's content
          const newState = update.payload as NotePresentationState;
          if (newState.spotlightText) {
            setLastSpotlight({
              text: newState.spotlightText,
              settings: newState.spotlightSettings,
              emphasisList: newState.emphasisList || [],
              currentPage: newState.currentPage || 0,
              totalPages: newState.totalPages || 1,
            });
          }
        } else if (update.type === 'spotlight') {
          setState(prev => {
            const newState = prev ? { ...prev, ...update.payload } : null;
            // Save last spotlight if there's content
            if (newState?.spotlightText) {
              setLastSpotlight({
                text: newState.spotlightText,
                settings: newState.spotlightSettings,
                emphasisList: newState.emphasisList || [],
                currentPage: newState.currentPage || 0,
                totalPages: newState.totalPages || 1,
              });
            }
            return newState;
          });
        } else if (update.type === 'emphasis') {
          setState(prev => {
            const newState = prev ? { ...prev, emphasisList: update.payload.emphasisList || [] } : null;
            if (newState?.spotlightText && lastSpotlight) {
              setLastSpotlight(ls => ls ? { ...ls, emphasisList: update.payload.emphasisList || [] } : null);
            }
            return newState;
          });
        } else if (update.type === 'page') {
          setState(prev => {
            const newState = prev ? { 
              ...prev, 
              currentPage: update.payload.currentPage ?? prev.currentPage,
              totalPages: update.payload.totalPages ?? prev.totalPages 
            } : null;
            if (newState?.spotlightText && lastSpotlight) {
              setLastSpotlight(ls => ls ? { 
                ...ls, 
                currentPage: update.payload.currentPage ?? ls.currentPage,
                totalPages: update.payload.totalPages ?? ls.totalPages 
              } : null);
            }
            return newState;
          });
        } else if (update.type === 'settings') {
          setState(prev => {
            const newState = prev ? { ...prev, spotlightSettings: update.payload.spotlightSettings! } : null;
            if (lastSpotlight) {
              setLastSpotlight(ls => ls ? { ...ls, settings: update.payload.spotlightSettings! } : null);
            }
            return newState;
          });
        } else if (update.type === 'clear') {
          // Don't clear lastSpotlight - keep showing the last content
          setState(prev => prev ? { ...prev, spotlightOpen: false, spotlightText: '', emphasisList: [] } : null);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          console.log('Audience connected to notes presentation channel');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  // Use current spotlight or fall back to last spotlight
  const displayState = useMemo(() => {
    if (state?.spotlightOpen && state?.spotlightText) {
      return {
        text: state.spotlightText,
        settings: state.spotlightSettings || DEFAULT_SPOTLIGHT_SETTINGS,
        emphasisList: state.emphasisList || [],
        currentPage: state.currentPage || 0,
        totalPages: state.totalPages || 1,
        isLive: true,
      };
    }
    if (lastSpotlight) {
      return {
        ...lastSpotlight,
        isLive: false,
      };
    }
    return null;
  }, [state, lastSpotlight]);

  const settings = displayState?.settings || DEFAULT_SPOTLIGHT_SETTINGS;

  // Parse scripture from the displayed text
  const parsedScripture = useMemo(() => {
    if (!displayState?.text) return null;
    return parseScriptureFromHighlight(displayState.text);
  }, [displayState?.text]);

  // Check if this is a scripture with multiple verses
  const hasMultipleVerses = parsedScripture && parsedScripture.verses.length > 1;
  const totalPages = hasMultipleVerses 
    ? getTotalPages(parsedScripture.verses.length, settings.versesPerPage)
    : 1;

  // Get current verses to display
  const currentVerses = useMemo(() => {
    if (!hasMultipleVerses) return [];
    return getVerseGroup(parsedScripture.verses, displayState?.currentPage || 0, settings.versesPerPage);
  }, [parsedScripture, displayState?.currentPage, settings.versesPerPage, hasMultipleVerses]);

  // Get font family based on settings
  const getFontFamily = () => {
    const fontOption = FONT_OPTIONS.find(f => f.id === settings.fontOption);
    return fontOption?.fontFamily || 'Georgia, serif';
  };

  // Get emphasis style classes based on color
  const getEmphasisStyles = (colorId: string, isLight: boolean) => {
    const color = EMPHASIS_COLORS.find(c => c.id === colorId) || EMPHASIS_COLORS[0];
    
    if (settings.emphasisStyle === 'highlight') {
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
          textDecorationThickness: '4px',
          textUnderlineOffset: '4px',
        },
      };
    }
  };

  // Render text with emphasis
  const renderTextWithEmphasis = (textContent: string, isLight: boolean) => {
    const emphasisList = displayState?.emphasisList || [];
    if (emphasisList.length === 0) return textContent;

    const positions: { start: number; end: number; text: string; colorId: string }[] = [];
    emphasisList.forEach((emp) => {
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
        <motion.span
          key={`emphasis-${idx}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={emphasisStyle.className}
          style={emphasisStyle.style}
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

  // Get animation variants
  const getAnimationVariants = () => {
    const preset = settings.animationPreset || 'fadeZoom';
    switch (preset) {
      case 'fade':
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
      case 'zoom':
        return { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 } };
      case 'slideUp':
        return { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 50 } };
      case 'slideDown':
        return { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -50 } };
      default:
        return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };
    }
  };

  const isPresentation = settings.mode === 'presentation';
  const isLight = settings.textColor === 'light';

  // Only show waiting screen when not connected (no displayState means nothing to show yet)
  if (!connected) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-12"
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
        
        <div className="relative z-10 text-center">
          <div className="inline-block px-8 py-4 bg-black/30 backdrop-blur-sm rounded-2xl">
            <p className={`text-xl md:text-2xl ${isLight ? 'text-white/70' : 'text-gray-800/70'}`}>
              Connecting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting screen only if we have no content at all (no current and no last)
  if (!displayState) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-12"
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
        
        <div className="relative z-10 text-center">
          <div className="inline-block px-8 py-4 bg-black/30 backdrop-blur-sm rounded-2xl">
            <p className={`text-xl md:text-2xl ${isLight ? 'text-white/70' : 'text-gray-800/70'}`}>
              Waiting for presenter...
            </p>
            {state?.noteTitle && (
              <p className={`text-sm mt-2 ${isLight ? 'text-white/50' : 'text-gray-800/50'}`}>
                {state.noteTitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Presentation View
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8 md:p-12 relative"
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

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displayState.text + displayState.currentPage}
          {...getAnimationVariants()}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 max-w-5xl w-full"
        >
          {/* Scripture Reference (if applicable) */}
          {parsedScripture && (
            <div className={`text-center mb-6 ${isLight ? 'text-white/60' : 'text-gray-800/60'}`}>
              <span className="text-lg uppercase tracking-widest font-medium">
                {parsedScripture.reference}
                {hasMultipleVerses && currentVerses.length > 0 && (
                  <span className="ml-2 text-sm">
                    (v. {currentVerses[0].verseNumber}
                    {currentVerses.length > 1 && `-${currentVerses[currentVerses.length - 1].verseNumber}`})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Main Text */}
          <div
            className={`text-center leading-relaxed font-bold ${
              isLight ? 'text-white' : 'text-gray-900'
            }`}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${(settings.fontSize || 1) * 2.5}rem`,
              lineHeight: 1.4,
              textShadow: isLight ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {hasMultipleVerses ? (
              // Display paginated verses
              <div className="space-y-4">
                {currentVerses.map((verse, idx) => (
                  <p key={`verse-${verse.verseNumber}-${idx}`}>
                    {formatVerseText(verse, isLight)}
                  </p>
                ))}
              </div>
            ) : (
              // Display regular text
              renderTextWithEmphasis(displayState.text, isLight)
            )}
          </div>

          {/* Pagination for scripture verses */}
          {hasMultipleVerses && totalPages > 1 && (
            <div className={`flex items-center justify-center gap-4 mt-8 ${isLight ? 'text-white/60' : 'text-gray-800/60'}`}>
              <span className="text-sm">
                Page {(displayState.currentPage || 0) + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === (displayState.currentPage || 0)
                        ? isLight ? 'bg-white' : 'bg-gray-800'
                        : isLight ? 'bg-white/30' : 'bg-gray-800/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
