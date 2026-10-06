"use client";

import { useEffect, useCallback, useReducer, useRef } from "react";
import {
  sendDiscordNotification,
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
  initAudioContext,
} from "@/lib/notifications";
import {
  createInitialState,
  formatTime,
  getDurationSeconds,
  parseSavedState,
  timerReducer,
  type TimerSettings,
  type TimerState,
} from "@/lib/timer";

export type { TimerMode, TimerSettings } from "@/lib/timer";

const STORAGE_KEY = "pomodoro-state";
const DEFAULT_TITLE = "Pomodoro Timer";
// Refresh often enough that the display never lags a second behind.
const TICK_INTERVAL_MS = 250;

const MODE_TITLES = {
  work: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
} as const;

/**
 * Reads the persisted state, tolerating storage that is blocked (for example
 * in a third-party iframe with storage access denied).
 *
 * Returns:
 *   The raw stored string, or null.
 */
function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Writes the persisted state, ignoring blocked or full storage.
 *
 * Args:
 *   value: Serialized state.
 */
function writeStorage(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable: the timer keeps working without persistence.
  }
}

/**
 * Plays the sound and sends notifications for a finished session.
 *
 * Args:
 *   state: State at the moment the session ended.
 */
function notifyCompletion(state: TimerState): void {
  playNotificationSound();
  showBrowserNotification(state.mode, state.sessionsCompleted);
  if (state.settings.discordNotificationEnabled) {
    sendDiscordNotification(state.mode, state.sessionsCompleted);
  }
}

export function usePomodoro() {
  const [state, dispatch] = useReducer(timerReducer, undefined, createInitialState);
  const { mode, timeLeft, endTime, sessionsCompleted, settings, loaded } = state;
  const isActive = endTime !== null;

  // Latest state for timer callbacks, which outlive individual renders.
  const stateRef = useRef(state);
  // endTime of the last run whose completion was handled, to avoid double alerts.
  const completedEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load state from localStorage on mount.
  useEffect(() => {
    dispatch({ type: "load", saved: parseSavedState(readStorage()) });
  }, []);

  // Save state to localStorage whenever it changes.
  useEffect(() => {
    if (!loaded) return;
    writeStorage(
      JSON.stringify({ mode, timeLeft, sessionsCompleted, settings })
    );
  }, [loaded, mode, timeLeft, sessionsCompleted, settings]);

  const completeSession = useCallback((current: TimerState) => {
    notifyCompletion(current);
    dispatch({ type: "complete", endTime: current.endTime });
  }, []);

  // Recompute the remaining time from the wall clock; finish when it is up.
  const syncWithClock = useCallback(() => {
    const current = stateRef.current;
    if (current.endTime === null) return;
    const now = Date.now();
    if (now >= current.endTime) {
      if (completedEndTimeRef.current === current.endTime) return;
      completedEndTimeRef.current = current.endTime;
      completeSession(current);
      return;
    }
    dispatch({ type: "tick", now });
  }, [completeSession]);

  // Timer countdown driven by timestamps, so throttled timers cannot drift.
  useEffect(() => {
    if (endTime === null) return;
    const interval = setInterval(syncWithClock, TICK_INTERVAL_MS);
    // A one-shot timeout lands close to the end even when the interval is
    // heavily throttled in a background tab.
    const timeout = setTimeout(
      syncWithClock,
      Math.max(0, endTime - Date.now()) + 50
    );
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [endTime, syncWithClock]);

  // Catch up immediately when the tab or iframe becomes visible again.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncWithClock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncWithClock]);

  const totalDuration = getDurationSeconds(mode, settings);

  // Show the countdown in the tab title while a session is in progress.
  useEffect(() => {
    const inProgress = isActive || timeLeft < totalDuration;
    if (!inProgress) {
      document.title = DEFAULT_TITLE;
      return;
    }
    const { minutes, seconds } = formatTime(timeLeft);
    const pausedMark = isActive ? "" : " (paused)";
    document.title = `${minutes}:${seconds}${pausedMark} · ${MODE_TITLES[mode]}`;
  }, [isActive, timeLeft, totalDuration, mode]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  // Stable across ticks (reads stateRef), so key listeners are not re-added.
  const toggleTimer = useCallback(() => {
    const current = stateRef.current;
    if (current.endTime !== null) {
      const now = Date.now();
      if (now >= current.endTime) {
        // Time is already up: complete (with notifications) instead of pausing.
        syncWithClock();
        return;
      }
      dispatch({ type: "pause", now });
      return;
    }
    // Initialize AudioContext on user interaction (required for autoplay policy)
    initAudioContext();
    // Ask for notification permission from a user gesture, as browsers require.
    requestNotificationPermission();
    dispatch({ type: "start", now: Date.now() });
  }, [syncWithClock]);

  const resetTimer = () => {
    dispatch({ type: "reset" });
  };

  const skipSession = () => {
    // Initialize AudioContext on user interaction (required for autoplay policy)
    initAudioContext();
    completeSession(stateRef.current);
  };

  const resetSessionCount = () => {
    dispatch({ type: "resetSessionCount" });
  };

  const updateSettings = (newSettings: Partial<TimerSettings>) => {
    dispatch({ type: "updateSettings", settings: newSettings });
  };

  return {
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
  };
}
