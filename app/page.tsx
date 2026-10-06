"use client";

import { useEffect } from "react";
import { usePomodoro } from "@/hooks/use-pomodoro";
import { TimerDisplay } from "@/components/timer-display";
import { Controls } from "@/components/controls";
import { SettingsModal } from "@/components/settings-modal";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCycleProgress } from "@/lib/timer";

/**
 * Returns true when a key event comes from a control that handles keys itself.
 *
 * Args:
 *   target: Event target.
 *
 * Returns:
 *   Whether the global shortcut should be ignored.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(
      'button, a, input, textarea, select, [role="switch"], [role="slider"], [role="dialog"], [contenteditable="true"]'
    ) !== null
  );
}

export default function Home() {
  const {
    mode,
    timeLeft,
    isActive,
    sessionsCompleted,
    settings,
    totalDuration,
    toggleTimer,
    resetTimer,
    skipSession,
    resetSessionCount,
    updateSettings,
  } = usePomodoro();

  // Calculate visual progress: if not working (break), we visually "completed" the current session
  // If long break, we want to show full progress (all dots filled)
  const visualProgress = getCycleProgress(
    mode,
    sessionsCompleted,
    settings.longBreakInterval
  );

  // Space starts or pauses the timer when focus is not on another control.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      toggleTimer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTimer]);

  return (
    <main className="pomodoro-app relative flex h-dvh w-full items-center justify-center overflow-hidden bg-background p-[var(--pad)] text-foreground">
      {/* Background Gradient Spotlights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <SettingsModal settings={settings} onUpdateSettings={updateSettings} />

      <div className="pomodoro-layout z-10">
        {/* Timer Display now contains the Session Dots */}
        <TimerDisplay
          timeLeft={timeLeft}
          totalDuration={totalDuration}
          mode={mode}
          sessionProgress={visualProgress}
          maxSessions={settings.longBreakInterval}
        />

        <div className="pomodoro-side">
          <Controls
            isActive={isActive}
            onToggle={toggleTimer}
            onReset={resetTimer}
            onSkip={skipSession}
          />

          {/* Additional Status Text & Reset Logic */}
          <div className="flex items-center justify-center">
            {/* Spacer to balance the reset button */}
            <div className="pomodoro-footer-spacer size-[var(--btn-mini)]" />

            <p className="mx-[0.5em] whitespace-nowrap text-[length:var(--footer-font)] uppercase tracking-widest text-muted-foreground opacity-60">
              <span className="pomodoro-footer-word">POMODORO </span>#
              {sessionsCompleted + 1}
            </p>

            <Button
              variant="ghost"
              size="icon"
              onClick={resetSessionCount}
              className="size-[var(--btn-mini)] text-muted-foreground/40 hover:text-white"
              title="Reset Session Count"
            >
              <RotateCw className="size-[50%]" />
              <span className="sr-only">Reset Session Count</span>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
