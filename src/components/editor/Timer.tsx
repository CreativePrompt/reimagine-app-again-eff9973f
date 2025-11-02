import { useState, useEffect } from "react";

export function Timer() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={() => setIsRunning(!isRunning)}
        className="font-mono text-lg font-bold tracking-wider hover:text-primary transition-colors"
      >
        TIMER: {formatTime(time)}
      </button>
      <span className="text-xs text-muted-foreground font-mono">
        TIME: {getCurrentTime()}
      </span>
    </div>
  );
}
