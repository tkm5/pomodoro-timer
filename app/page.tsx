"use client";

import { usePomodoro } from "@/hooks/use-pomodoro";
import { TimerDisplay } from "@/components/timer-display";
import { Controls } from "@/components/controls";
import { SettingsModal } from "@/components/settings-modal";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const effectiveSessions = sessionsCompleted + (mode === "work" ? 0 : 1);
  const sessionProgress = effectiveSessions % settings.longBreakInterval;
  // Fix Edge case: If long break, we want to show full progress (all dots filled)
  // But modulo 4 gives 0. So special check.
  const visualProgress =
    mode === "longBreak" ? settings.longBreakInterval : sessionProgress;

  const isLongBreakNext =
    sessionProgress === settings.longBreakInterval - 1 && mode === "work";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background Gradient Spotlights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <SettingsModal settings={settings} onUpdateSettings={updateSettings} />

      <div className="z-10 flex flex-col items-center space-y-8 w-full max-w-2xl px-4">
        {/* Timer Display now contains the Session Dots */}
        <TimerDisplay
          timeLeft={timeLeft}
          totalDuration={totalDuration}
          mode={mode}
          sessionProgress={visualProgress}
          maxSessions={settings.longBreakInterval}
        />

        <Controls
          isActive={isActive}
          onToggle={toggleTimer}
          onReset={resetTimer}
          onSkip={skipSession}
        />

        {/* Additional Status Text & Reset Logic */}
        <div className="flex items-center space-x-4">
          <p className="text-muted-foreground text-sm tracking-widest uppercase opacity-60">
            POMODORO #{sessionsCompleted + 1}
          </p>

          <Button
            variant="ghost"
            size="icon"
            onClick={resetSessionCount}
            className="h-6 w-6 text-muted-foreground/40 hover:text-white"
            title="Reset Session Count"
          >
            <RotateCw className="h-3 w-3" />
            <span className="sr-only">Reset Session Count</span>
          </Button>
        </div>
      </div>
    </main>
  );
}
