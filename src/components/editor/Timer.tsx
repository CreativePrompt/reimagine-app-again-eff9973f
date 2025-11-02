import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Clock, Minus, Plus, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Timer() {
  const [time, setTime] = useState(0);
  const [targetTime, setTargetTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [mode, setMode] = useState<"stopwatch" | "countdown">("stopwatch");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => {
          if (mode === "countdown" && prev <= 0) {
            setIsRunning(false);
            return 0;
          }
          return mode === "countdown" ? prev - 1 : prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleQuickSet = (minutes: number) => {
    const seconds = minutes * 60;
    setTime(seconds);
    setTargetTime(seconds);
    setMode("countdown");
  };

  const handleCustomSet = () => {
    const seconds = customMinutes * 60;
    setTime(seconds);
    setTargetTime(seconds);
    setMode("countdown");
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === "countdown") {
      setTime(targetTime);
    } else {
      setTime(0);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setTime(0);
    setTargetTime(0);
  };

  const adjustTime = (delta: number) => {
    setTime((prev) => Math.max(0, prev + delta));
  };

  const getProgressPercentage = () => {
    if (mode === "countdown" && targetTime > 0) {
      return (time / targetTime) * 100;
    }
    return 100;
  };

  const isWarning = mode === "countdown" && time <= 60 && time > 0;
  const isDanger = mode === "countdown" && time <= 10 && time > 0;

  return (
    <>
      <motion.button
        onClick={() => setShowSettings(true)}
        className={cn(
          "relative flex flex-col items-end gap-0.5 px-4 py-2 rounded-xl overflow-hidden",
          "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
          "hover:shadow-lg hover:shadow-primary/30 transition-all duration-300",
          "border border-primary/20",
          isWarning && "from-warning via-warning/90 to-warning/70 animate-pulse",
          isDanger && "from-destructive via-destructive/90 to-destructive/70 animate-pulse"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Animated background effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <div className="relative flex items-center gap-2">
          <Clock className="h-4 w-4 text-white" />
          <span className="font-mono text-lg font-bold tracking-wider text-white">
            {formatTime(time)}
          </span>
        </div>
        <span className="text-xs text-white/80 font-mono">
          {getCurrentTime()}
        </span>
      </motion.button>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Timer Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Timer Display */}
            <div className="relative">
              <motion.div
                className={cn(
                  "text-center py-8 rounded-2xl relative overflow-hidden",
                  "bg-gradient-to-br from-muted to-muted/50",
                  isWarning && "from-warning/20 to-warning/10",
                  isDanger && "from-destructive/20 to-destructive/10"
                )}
                animate={isDanger ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.5, repeat: isDanger ? Infinity : 0 }}
              >
                {/* Progress bar */}
                {mode === "countdown" && (
                  <motion.div
                    className={cn(
                      "absolute bottom-0 left-0 h-1 bg-primary",
                      isWarning && "bg-warning",
                      isDanger && "bg-destructive"
                    )}
                    initial={{ width: "100%" }}
                    animate={{ width: `${getProgressPercentage()}%` }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adjustTime(-60)}
                    className="h-12 w-12"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <motion.div
                    key={time}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-mono text-6xl font-bold"
                  >
                    {formatTime(time)}
                  </motion.div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adjustTime(60)}
                    className="h-12 w-12"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  {mode === "countdown" ? "Countdown" : "Stopwatch"} Mode
                </div>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setIsRunning(!isRunning)}
                size="lg"
                className={cn(
                  "h-14 px-8 rounded-xl font-semibold",
                  "bg-gradient-to-r shadow-lg transition-all duration-300",
                  isRunning
                    ? "from-warning to-warning/80 hover:shadow-warning/30"
                    : "from-primary to-primary/80 hover:shadow-primary/30"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </>
                )}
              </Button>

              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="h-14 px-6 rounded-xl"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>

              <Button
                onClick={handleStop}
                size="lg"
                variant="outline"
                className="h-14 px-6 rounded-xl text-destructive hover:bg-destructive/10"
              >
                Stop
              </Button>
            </div>

            {/* Quick Set */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Quick Set</h4>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 45, 60, 90, 120].map((minutes) => (
                  <Button
                    key={minutes}
                    variant="outline"
                    onClick={() => handleQuickSet(minutes)}
                    className="h-12 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {minutes}min
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Time */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Custom Time</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                  className="flex-1 h-12 text-center text-lg font-semibold"
                  placeholder="Minutes"
                />
                <Button
                  onClick={handleCustomSet}
                  className="h-12 px-6 bg-gradient-to-r from-primary to-primary/80"
                >
                  Set
                </Button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant={mode === "stopwatch" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setMode("stopwatch");
                  setTime(0);
                  setIsRunning(false);
                }}
                className="rounded-full"
              >
                Stopwatch
              </Button>
              <Button
                variant={mode === "countdown" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setMode("countdown");
                  setIsRunning(false);
                }}
                className="rounded-full"
              >
                Countdown
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
