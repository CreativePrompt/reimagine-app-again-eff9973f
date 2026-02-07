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
        } else if (update.type === 'spotlight') {
          setState(prev => prev ? { ...prev, ...update.payload } : null);
        } else if (update.type === 'emphasis') {
          setState(prev => prev ? { ...prev, emphasisList: update.payload.emphasisList || [] } : null);
        } else if (update.type === 'page') {
          setState(prev => prev ? { 
            ...prev, 
            currentPage: update.payload.currentPage ?? prev.currentPage,
            totalPages: update.payload.totalPages ?? prev.totalPages 
          } : null);
        } else if (update.type === 'settings') {
          setState(prev => prev ? { ...prev, spotlightSettings: update.payload.spotlightSettings! } : null);
        } else if (update.type === 'clear') {
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

  const settings = state?.spotlightSettings || DEFAULT_SPOTLIGHT_SETTINGS;

  // Parse scripture from the highlighted text
  const parsedScripture = useMemo(() => {
    if (!state?.spotlightText) return null;
    return parseScriptureFromHighlight(state.spotlightText);
  }, [state?.spotlightText]);

  // Check if this is a scripture with multiple verses
  const hasMultipleVerses = parsedScripture && parsedScripture.verses.length > 1;
  const totalPages = hasMultipleVerses 
    ? getTotalPages(parsedScripture.verses.length, settings.versesPerPage)
    : 1;

  // Get current verses to display
  const currentVerses = useMemo(() => {
    if (!hasMultipleVerses) return [];
    return getVerseGroup(parsedScripture.verses, state?.currentPage || 0, settings.versesPerPage);
  }, [parsedScripture, state?.currentPage, settings.versesPerPage, hasMultipleVerses]);

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
    const emphasisList = state?.emphasisList || [];
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

  // Waiting screen when not connected or no spotlight
  if (!connected || !state?.spotlightOpen || !state?.spotlightText) {
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
              {connected ? 'Waiting for presenter...' : 'Connecting...'}
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
          key={state.spotlightText}
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
              renderTextWithEmphasis(state.spotlightText, isLight)
            )}
          </div>

          {/* Pagination for scripture verses */}
          {hasMultipleVerses && totalPages > 1 && (
            <div className={`flex items-center justify-center gap-4 mt-8 ${isLight ? 'text-white/60' : 'text-gray-800/60'}`}>
              <span className="text-sm">
                Page {(state.currentPage || 0) + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === (state.currentPage || 0)
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
