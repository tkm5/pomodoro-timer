import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";

interface ControlsProps {
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export function Controls({
  isActive,
  onToggle,
  onReset,
  onSkip,
}: ControlsProps) {
  return (
    <div className="pomodoro-controls">
      <Button
        variant="ghost"
        size="icon"
        onClick={onReset}
        title="Reset"
        className="pomodoro-control-reset size-[var(--btn-side)] rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
      >
        <RotateCcw className="size-[50%]" />
        <span className="sr-only">Reset</span>
      </Button>

      <Button
        onClick={onToggle}
        title={isActive ? "Pause (Space)" : "Start (Space)"}
        className="pomodoro-control-play size-[var(--btn-main)] rounded-full bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(57,255,20,0.4)]"
      >
        {isActive ? (
          <Pause className="size-[50%] fill-current" />
        ) : (
          <Play className="size-[50%] fill-current ml-[5%]" />
        )}
        <span className="sr-only">{isActive ? "Pause" : "Start"}</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onSkip}
        title="Skip"
        className="pomodoro-control-skip size-[var(--btn-side)] rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
      >
        <SkipForward className="size-[50%]" />
        <span className="sr-only">Skip</span>
      </Button>
    </div>
  );
}
