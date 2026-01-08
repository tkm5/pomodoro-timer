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
    <div className="flex items-center gap-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onReset}
        className="h-12 w-12 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
      >
        <RotateCcw className="h-6 w-6" />
        <span className="sr-only">Reset</span>
      </Button>

      <Button
        onClick={onToggle}
        className="h-20 w-20 rounded-full bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(57,255,20,0.4)]"
      >
        {isActive ? (
          <Pause className="h-10 w-10 fill-current" />
        ) : (
          <Play className="h-10 w-10 fill-current ml-1" />
        )}
        <span className="sr-only">{isActive ? "Pause" : "Start"}</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onSkip}
        className="h-12 w-12 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
      >
        <SkipForward className="h-6 w-6" />
        <span className="sr-only">Skip</span>
      </Button>
    </div>
  );
}
