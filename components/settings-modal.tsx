import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimerSettings } from "@/hooks/use-pomodoro";

interface SettingsModalProps {
  settings: TimerSettings;
  onUpdateSettings: (newSettings: Partial<TimerSettings>) => void;
}

export function SettingsModal({
  settings,
  onUpdateSettings,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<TimerSettings>(settings);
  const [open, setOpen] = useState(false);

  // Sync local state when settings prop changes (e.g. initial load)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setOpen(false);
  };

  const handleChange = (key: keyof TimerSettings, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setLocalSettings((prev) => ({
        ...prev,
        [key]: numValue,
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 text-muted-foreground hover:text-white"
        >
          <Settings2 className="h-6 w-6" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-none text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="workDuration"
              className="text-right text-muted-foreground col-span-2"
            >
              Work Duration (min)
            </Label>
            <Input
              id="workDuration"
              type="number"
              value={localSettings.workDuration}
              onChange={(e) => handleChange("workDuration", e.target.value)}
              className="col-span-2 bg-input border-transparent focus:border-primary text-right font-mono text-lg"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="shortBreak"
              className="text-right text-muted-foreground col-span-2"
            >
              Short Break (min)
            </Label>
            <Input
              id="shortBreak"
              type="number"
              value={localSettings.shortBreakDuration}
              onChange={(e) =>
                handleChange("shortBreakDuration", e.target.value)
              }
              className="col-span-2 bg-input border-transparent focus:border-primary text-right font-mono text-lg"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="longBreak"
              className="text-right text-muted-foreground col-span-2"
            >
              Long Break (min)
            </Label>
            <Input
              id="longBreak"
              type="number"
              value={localSettings.longBreakDuration}
              onChange={(e) =>
                handleChange("longBreakDuration", e.target.value)
              }
              className="col-span-2 bg-input border-transparent focus:border-primary text-right font-mono text-lg"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="interval"
              className="text-right text-muted-foreground col-span-2"
            >
              Long Break Interval
            </Label>
            <Input
              id="interval"
              type="number"
              value={localSettings.longBreakInterval}
              onChange={(e) =>
                handleChange("longBreakInterval", e.target.value)
              }
              className="col-span-2 bg-input border-transparent focus:border-primary text-right font-mono text-lg"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
