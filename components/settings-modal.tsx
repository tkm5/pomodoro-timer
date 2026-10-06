import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { TimerSettings } from "@/hooks/use-pomodoro";
import { SETTING_LIMITS } from "@/lib/timer";

const LABEL_CLASS =
  "text-right text-xs text-muted-foreground col-span-2 sm:text-sm";
const INPUT_CLASS =
  "col-span-2 bg-input border-transparent focus:border-primary text-right font-mono text-base sm:text-lg";
const ROW_CLASS = "grid grid-cols-4 items-center gap-2 sm:gap-4";

type NumericKey = keyof typeof SETTING_LIMITS;

// Numeric fields are edited as strings so a field can be cleared while typing.
type FormValues = Record<NumericKey, string> & {
  discordNotificationEnabled: boolean;
};

const NUMERIC_FIELDS: { key: NumericKey; id: string; label: string }[] = [
  { key: "workDuration", id: "workDuration", label: "Work Duration (min)" },
  { key: "shortBreakDuration", id: "shortBreak", label: "Short Break (min)" },
  { key: "longBreakDuration", id: "longBreak", label: "Long Break (min)" },
  { key: "longBreakInterval", id: "interval", label: "Long Break Interval" },
];

/**
 * Converts settings to editable form values.
 *
 * Args:
 *   settings: Current settings.
 *
 * Returns:
 *   Form values with numbers rendered as strings.
 */
function toFormValues(settings: TimerSettings): FormValues {
  return {
    workDuration: String(settings.workDuration),
    shortBreakDuration: String(settings.shortBreakDuration),
    longBreakDuration: String(settings.longBreakDuration),
    longBreakInterval: String(settings.longBreakInterval),
    discordNotificationEnabled: settings.discordNotificationEnabled,
  };
}

interface SettingsModalProps {
  settings: TimerSettings;
  onUpdateSettings: (newSettings: Partial<TimerSettings>) => void;
}

export function SettingsModal({
  settings,
  onUpdateSettings,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<FormValues>(() =>
    toFormValues(settings)
  );
  const [open, setOpen] = useState(false);

  // Start every opening from the saved settings, discarding unsaved edits.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setLocalSettings(toFormValues(settings));
    setOpen(nextOpen);
  };

  const handleSave = () => {
    const numeric: Partial<TimerSettings> = {};
    for (const { key } of NUMERIC_FIELDS) {
      const value = parseInt(localSettings[key], 10);
      // Out-of-range values are clamped by the timer; blanks keep the old value.
      if (!isNaN(value)) numeric[key] = value;
    }
    onUpdateSettings({
      ...numeric,
      discordNotificationEnabled: localSettings.discordNotificationEnabled,
    });
    setOpen(false);
  };

  const handleChange = (key: NumericKey, value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggle = (value: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      discordNotificationEnabled: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Settings"
          className="absolute top-[clamp(4px,2vmin,24px)] right-[clamp(4px,2vmin,24px)] z-20 size-[var(--btn-settings)] text-muted-foreground hover:text-white"
        >
          <Settings2 className="size-[60%]" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] gap-3 overflow-y-auto border-none bg-card p-4 text-card-foreground sm:max-w-[425px] sm:gap-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight sm:text-2xl">
            Settings
          </DialogTitle>
        </DialogHeader>
        <form
          id="settings-form"
          className="grid gap-3 py-1 sm:gap-6 sm:py-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {NUMERIC_FIELDS.map(({ key, id, label }) => (
            <div key={key} className={ROW_CLASS}>
              <Label htmlFor={id} className={LABEL_CLASS}>
                {label}
              </Label>
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={SETTING_LIMITS[key].min}
                max={SETTING_LIMITS[key].max}
                step={1}
                value={localSettings[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          ))}
          <div className={ROW_CLASS}>
            <Label htmlFor="discordNotification" className={LABEL_CLASS}>
              Discord Notification
            </Label>
            <div className="col-span-2 flex justify-end">
              <Switch
                id="discordNotification"
                checked={localSettings.discordNotificationEnabled}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="settings-form"
            className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
