import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightSettings } from "./SpotlightSettingsDialog";

interface SpotlightPopupProps {
  text: string;
  isOpen: boolean;
  onClose: () => void;
  settings: SpotlightSettings;
}

export function SpotlightPopup({ text, isOpen, onClose, settings }: SpotlightPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

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

  // Handle Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

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
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none`}
          >
            <div className={`w-[90%] ${getPopupWidth()} pointer-events-auto`}>
            {isPresentation ? (
              /* Presentation Mode */
              <div
                className={`rounded-xl overflow-hidden shadow-2xl ${getPopupHeight()} flex flex-col`}
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

                {/* Content */}
                <div className="relative z-[5] flex-1 flex items-center justify-center p-8 md:p-12">
                  <blockquote
                    className={`text-2xl md:text-3xl lg:text-4xl leading-relaxed font-serif italic text-center max-w-4xl ${
                      settings.textColor === 'light' ? 'text-white' : 'text-gray-900'
                    }`}
                    style={{
                      textShadow: settings.textColor === 'light' 
                        ? '0 2px 10px rgba(0,0,0,0.5)' 
                        : '0 2px 10px rgba(255,255,255,0.3)',
                    }}
                  >
                    "{text}"
                  </blockquote>
                </div>

                {/* Footer hint */}
                <div className="relative z-[5] py-4">
                  <p
                    className={`text-xs text-center ${
                      settings.textColor === 'light' ? 'text-white/60' : 'text-gray-900/60'
                    }`}
                  >
                    Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Esc</kbd> or click outside to close
                  </p>
                </div>
              </div>
            ) : (
              /* Standard Mode */
              <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-sm font-medium text-muted-foreground">Spotlight</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className={`p-8 overflow-y-auto ${settings.popupHeight !== 'auto' ? getPopupHeight() : 'max-h-[60vh]'}`}>
                  <blockquote className="text-xl md:text-2xl leading-relaxed font-serif italic text-foreground/90 border-l-4 border-amber-400 pl-6">
                    {text}
                  </blockquote>
                </div>

                {/* Footer hint */}
                <div className="px-6 py-3 border-t bg-muted/30">
                  <p className="text-xs text-muted-foreground text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> or click outside to close
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
