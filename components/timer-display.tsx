import { TimerMode } from "@/hooks/use-pomodoro";
import { formatTime } from "@/lib/timer";
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
  const { minutes, seconds } = formatTime(timeLeft);
  // Three-digit minutes need a smaller font to stay inside the ring.
  const digitScale = minutes.length > 2 ? 0.22 : 0.274;

  const modeLabels: Record<TimerMode, string> = {
    work: "FOCUS",
    shortBreak: "SHORT BREAK",
    longBreak: "LONG BREAK",
  };

  // Circular progress math
  const radius = 320;
  const circumference = 2 * Math.PI * radius;

  const elapsed = totalDuration - timeLeft;
  const progress =
    totalDuration > 0 ? Math.min(1, Math.max(0, elapsed / totalDuration)) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* SVG Circle: drawn in a 700-unit box and scaled to --ring */}
        <svg
          viewBox="0 0 700 700"
          aria-hidden="true"
          className="size-[var(--ring)] transform -rotate-90"
        >
          <circle
            cx="350"
            cy="350"
            r={radius}
            stroke="currentColor"
            fill="transparent"
            className="pomodoro-ring-track text-white/5"
          />
          <circle
            cx="350"
            cy="350"
            r={radius}
            stroke="currentColor"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="pomodoro-ring-progress text-primary transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Inner Content: Restored absolute inset-0 for full size container (Glow works here) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(var(--ring)*0.046)]">
          {/* Time */}
          <h1
            style={{ fontSize: `calc(var(--ring) * ${digitScale})` }}
            className="flex items-center leading-none font-bold tracking-tighter tabular-nums select-none text-white drop-shadow-2xl"
          >
            <span>{minutes}</span>
            <span className="mx-[0.083em] -translate-y-[0.05em]">:</span>
            <span>{seconds}</span>
          </h1>

          {/* Session Dots */}
          <div
            role="img"
            aria-label={`${sessionProgress} of ${maxSessions} sessions in this cycle`}
            className="flex gap-[max(3px,calc(var(--ring)*0.017))]"
          >
            {Array.from({ length: maxSessions }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "size-[max(4px,calc(var(--ring)*0.017))] rounded-full transition-all duration-500",
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
          <div className="flex items-center space-x-2 mt-[calc(var(--ring)*0.023)]">
            <span className="text-[length:max(9px,calc(var(--ring)*0.034))] font-medium tracking-widest text-primary/80 uppercase">
              {modeLabels[mode]}
            </span>
          </div>

          {/* Neon Glow Effect behind text - Restored */}
          <div
            aria-hidden="true"
            className="absolute inset-0 blur-[calc(var(--ring)*0.17)] opacity-15 pointer-events-none bg-primary rounded-full z-[-1]"
          />
        </div>
      </div>
    </div>
  );
}
