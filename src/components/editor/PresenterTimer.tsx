import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
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
    <div className="space-y-3">
      {/* Compact Timer Display */}
      <div
        className={cn(
          "rounded-xl p-4 border-2 transition-colors duration-300",
          !isWarning && !isDanger && !isOvertime && "border-border bg-card",
          isWarning && "border-warning/50 bg-warning/5",
          isDanger && "border-destructive/50 bg-destructive/5",
          isOvertime && "border-destructive bg-destructive/10"
        )}
      >
        <div className="text-center">
          {/* Timer Display */}
          <div
            className={cn(
              "font-mono font-bold tracking-wider text-4xl mb-2",
              !isWarning && !isDanger && !isOvertime && "text-foreground",
              isWarning && "text-warning",
              isDanger && "text-destructive",
              isOvertime && "text-destructive animate-pulse"
            )}
          >
            {formatTime(time)}
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              mode === "countdown" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {mode === "countdown" ? "Countdown" : "Stopwatch"}
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Running
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="sm"
              className={cn(
                "h-10 px-6 font-semibold rounded-lg",
                isRunning
                  ? "bg-warning hover:bg-warning/90"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              size="sm"
              variant="outline"
              className="h-10 px-4 rounded-lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Set Buttons */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">Quick Set Timer</h4>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 45, 60].map((minutes) => (
            <Button
              key={minutes}
              variant="outline"
              onClick={() => handleQuickSet(minutes)}
              className="h-10 font-semibold hover:bg-primary hover:text-primary-foreground"
            >
              {minutes}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
