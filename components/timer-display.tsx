import { TimerMode } from "@/hooks/use-pomodoro";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  timeLeft: number;
  totalDuration: number;
  mode: TimerMode;
  sessionProgress: number;
  maxSessions: number;
  className?: string;
}

export function TimerDisplay({
  timeLeft,
  totalDuration,
  mode,
  sessionProgress,
  maxSessions,
  className,
}: TimerDisplayProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const modeLabels: Record<TimerMode, string> = {
    work: "FOCUS",
    shortBreak: "SHORT BREAK",
    longBreak: "LONG BREAK",
  };

  // Circular progress math
  const radius = 320;
  const circumference = 2 * Math.PI * radius;

  const elapsed = totalDuration - timeLeft;
  const progress = elapsed / totalDuration;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* SVG Circle */}
        <svg className="w-[700px] h-[700px] transform -rotate-90">
          <circle
            cx="350"
            cy="350"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-white/5"
          />
          <circle
            cx="350"
            cy="350"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Inner Content: Restored absolute inset-0 for full size container (Glow works here) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8">
          {/* Time */}
          <h1 className="flex items-center text-[12rem] leading-none font-bold tracking-tighter tabular-nums select-none text-white drop-shadow-2xl">
            <span>{minutes.toString().padStart(2, "0")}</span>
            <span className="mx-4 -translate-y-[0.05em]">:</span>
            <span>{seconds.toString().padStart(2, "0")}</span>
          </h1>

          {/* Session Dots */}
          <div className="flex space-x-3">
            {Array.from({ length: maxSessions }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-3 w-3 rounded-full transition-all duration-500",
                  i < sessionProgress
                    ? "bg-primary"
                    : i === sessionProgress && mode === "work"
                    ? "bg-primary animate-pulse scale-125"
                    : "bg-white/10"
                )}
              />
            ))}
          </div>

          {/* Mode Label */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="text-2xl font-medium tracking-widest text-primary/80 uppercase">
              {modeLabels[mode]}
            </span>
          </div>

          {/* Neon Glow Effect behind text - Restored */}
          <div className="absolute inset-0 blur-[120px] opacity-15 pointer-events-none bg-primary rounded-full z-[-1]" />
        </div>
      </div>
    </div>
  );
}
