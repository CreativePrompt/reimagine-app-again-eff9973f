import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PresenterTimer() {
  const [time, setTime] = useState(0);
  const [targetTime, setTargetTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"stopwatch" | "countdown">("countdown");

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

  const handleQuickSet = (minutes: number) => {
    const seconds = minutes * 60;
    setTime(seconds);
    setTargetTime(seconds);
    setMode("countdown");
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === "countdown") {
      setTime(targetTime);
    } else {
      setTime(0);
    }
  };

  const isWarning = mode === "countdown" && time <= 300 && time > 60;
  const isDanger = mode === "countdown" && time <= 60 && time > 0;
  const isOvertime = mode === "countdown" && time <= 0;

  return (
    <div className="space-y-4">
      {/* Large Timer Display */}
      <motion.div
        className={cn(
          "relative rounded-3xl p-8 overflow-hidden",
          "bg-gradient-to-br from-card to-card/80",
          "border-4 transition-colors duration-300",
          !isWarning && !isDanger && !isOvertime && "border-primary/30",
          isWarning && "border-warning/50 bg-gradient-to-br from-warning/10 to-warning/5",
          isDanger && "border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/5",
          isOvertime && "border-destructive bg-gradient-to-br from-destructive/20 to-destructive/10"
        )}
        animate={isDanger || isOvertime ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 1, repeat: (isDanger || isOvertime) ? Infinity : 0 }}
      >
        {/* Animated background shimmer */}
        {isRunning && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        )}

        <div className="relative">
          {/* Timer Display */}
          <div className="text-center">
            <motion.div
              key={time}
              initial={{ scale: 1.1, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "font-mono font-bold tracking-wider mb-4",
                "text-8xl",
                !isWarning && !isDanger && !isOvertime && "text-foreground",
                isWarning && "text-warning",
                isDanger && "text-destructive",
                isOvertime && "text-destructive animate-pulse"
              )}
            >
              {formatTime(time)}
            </motion.div>

            {/* Mode & Status */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className={cn(
                "text-sm font-medium px-3 py-1 rounded-full",
                mode === "countdown" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {mode === "countdown" ? "Countdown" : "Stopwatch"}
              </span>
              {isRunning && (
                <span className="flex items-center gap-2 text-sm font-medium text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Running
                </span>
              )}
              {isOvertime && (
                <span className="text-sm font-bold text-destructive animate-pulse">
                  OVERTIME
                </span>
              )}
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setIsRunning(!isRunning)}
                size="lg"
                className={cn(
                  "h-16 px-10 text-lg font-bold rounded-2xl shadow-lg transition-all duration-300",
                  "bg-gradient-to-r",
                  isRunning
                    ? "from-warning to-warning/80 hover:shadow-warning/30"
                    : "from-primary to-primary/80 hover:shadow-primary/30"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-6 w-6 mr-3" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-6 w-6 mr-3" />
                    Start
                  </>
                )}
              </Button>

              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="h-16 px-8 text-lg rounded-2xl border-2"
              >
                <RotateCcw className="h-5 w-5 mr-3" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Set Buttons */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Quick Set Timer</h4>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 45, 60].map((minutes) => (
            <Button
              key={minutes}
              variant="outline"
              onClick={() => handleQuickSet(minutes)}
              className={cn(
                "h-14 font-bold text-lg transition-all duration-200",
                "hover:bg-primary hover:text-primary-foreground hover:scale-105",
                "border-2"
              )}
            >
              {minutes}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
