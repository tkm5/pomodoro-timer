/**
 * Pure timer logic for the Pomodoro Timer.
 *
 * The timer is driven by wall-clock timestamps instead of counting interval
 * ticks, so it stays accurate when the browser throttles timers (background
 * tabs, hidden iframes, sleeping devices). Everything here is free of React
 * and browser APIs so it can be unit tested.
 */

export type TimerMode = "work" | "shortBreak" | "longBreak";

export interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number; // sessions before long break
  discordNotificationEnabled: boolean; // Discord notification toggle
}

export const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  discordNotificationEnabled: false, // Default: disabled
};

/** Inclusive bounds for every numeric setting. */
export const SETTING_LIMITS = {
  workDuration: { min: 1, max: 180 },
  shortBreakDuration: { min: 1, max: 180 },
  longBreakDuration: { min: 1, max: 180 },
  longBreakInterval: { min: 1, max: 12 },
} as const;

type NumericSettingKey = keyof typeof SETTING_LIMITS;

const TIMER_MODES: readonly TimerMode[] = ["work", "shortBreak", "longBreak"];

/** Snapshot of the timer that is persisted and reduced. */
export interface TimerState {
  mode: TimerMode;
  /** Whole seconds shown to the user (rounded up). */
  timeLeft: number;
  /** Precise remaining time while paused, in milliseconds. */
  remainingMs: number;
  /** Epoch milliseconds at which the running session ends; null when paused. */
  endTime: number | null;
  sessionsCompleted: number;
  settings: TimerSettings;
  /** True once the persisted state has been read on the client. */
  loaded: boolean;
}

/** Shape written to localStorage. Kept compatible with earlier versions. */
export interface SavedState {
  mode: TimerMode;
  timeLeft: number;
  sessionsCompleted: number;
  settings: TimerSettings;
}

export type TimerAction =
  | { type: "load"; saved: SavedState | null }
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "tick"; now: number }
  | { type: "complete"; endTime: number | null }
  | { type: "reset" }
  | { type: "resetSessionCount" }
  | { type: "updateSettings"; settings: Partial<TimerSettings> };

/**
 * Clamps a value to an integer within the limits of a numeric setting.
 *
 * Args:
 *   key: Name of the numeric setting.
 *   value: Raw value; non-finite values fall back to the default.
 *
 * Returns:
 *   An integer within SETTING_LIMITS[key].
 */
function clampSetting(key: NumericSettingKey, value: unknown): number {
  const { min, max } = SETTING_LIMITS[key];
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return DEFAULT_SETTINGS[key];
  return Math.min(max, Math.max(min, Math.round(num)));
}

/**
 * Validates settings, filling gaps with defaults.
 *
 * Args:
 *   raw: Possibly partial or malformed settings (for example from storage).
 *
 * Returns:
 *   Complete settings whose numeric fields are within SETTING_LIMITS.
 */
export function sanitizeSettings(raw: unknown): TimerSettings {
  const input =
    raw && typeof raw === "object" ? (raw as Partial<TimerSettings>) : {};
  return {
    workDuration: clampSetting(
      "workDuration",
      input.workDuration ?? DEFAULT_SETTINGS.workDuration
    ),
    shortBreakDuration: clampSetting(
      "shortBreakDuration",
      input.shortBreakDuration ?? DEFAULT_SETTINGS.shortBreakDuration
    ),
    longBreakDuration: clampSetting(
      "longBreakDuration",
      input.longBreakDuration ?? DEFAULT_SETTINGS.longBreakDuration
    ),
    longBreakInterval: clampSetting(
      "longBreakInterval",
      input.longBreakInterval ?? DEFAULT_SETTINGS.longBreakInterval
    ),
    discordNotificationEnabled: input.discordNotificationEnabled === true,
  };
}

/**
 * Returns the length of a session.
 *
 * Args:
 *   mode: Session type.
 *   settings: Current settings.
 *
 * Returns:
 *   Duration in seconds.
 */
export function getDurationSeconds(
  mode: TimerMode,
  settings: TimerSettings
): number {
  switch (mode) {
    case "work":
      return settings.workDuration * 60;
    case "shortBreak":
      return settings.shortBreakDuration * 60;
    case "longBreak":
      return settings.longBreakDuration * 60;
  }
}

/**
 * Converts remaining milliseconds to the whole seconds shown on screen.
 *
 * Args:
 *   remainingMs: Remaining time in milliseconds; negatives count as zero.
 *
 * Returns:
 *   Remaining seconds rounded up, so "00:00" only appears at the very end.
 */
export function toDisplaySeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Formats seconds as MM:SS (minutes may exceed two digits).
 *
 * Args:
 *   totalSeconds: Non-negative number of seconds.
 *
 * Returns:
 *   An object with zero-padded minute and second strings.
 */
export function formatTime(totalSeconds: number): {
  minutes: string;
  seconds: string;
} {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return {
    minutes: Math.floor(safe / 60)
      .toString()
      .padStart(2, "0"),
    seconds: (safe % 60).toString().padStart(2, "0"),
  };
}

/**
 * Determines the session that follows the current one.
 *
 * Args:
 *   mode: The session that just ended.
 *   sessionsCompleted: Completed pomodoros before this transition.
 *   settings: Current settings.
 *
 * Returns:
 *   The next mode and the updated completed-session count. The count is
 *   incremented when a break ends, matching the original behaviour.
 */
export function getNextSession(
  mode: TimerMode,
  sessionsCompleted: number,
  settings: TimerSettings
): { mode: TimerMode; sessionsCompleted: number } {
  if (mode === "work") {
    const nextSessionsCompleted = sessionsCompleted + 1;
    return {
      mode:
        nextSessionsCompleted % settings.longBreakInterval === 0
          ? "longBreak"
          : "shortBreak",
      sessionsCompleted,
    };
  }
  return { mode: "work", sessionsCompleted: sessionsCompleted + 1 };
}

/**
 * Computes how many cycle dots are filled.
 *
 * Args:
 *   mode: Current session type.
 *   sessionsCompleted: Completed pomodoros.
 *   longBreakInterval: Sessions per cycle.
 *
 * Returns:
 *   Number of filled dots, from 0 to longBreakInterval.
 */
export function getCycleProgress(
  mode: TimerMode,
  sessionsCompleted: number,
  longBreakInterval: number
): number {
  if (mode === "longBreak") return longBreakInterval;
  // During a break the current pomodoro is already done.
  const effective = sessionsCompleted + (mode === "work" ? 0 : 1);
  return effective % longBreakInterval;
}

/**
 * Parses the persisted state, tolerating old or corrupted data.
 *
 * Args:
 *   json: Raw localStorage value, or null when nothing is stored.
 *
 * Returns:
 *   A validated SavedState, or null when the value is missing or unreadable.
 */
export function parseSavedState(json: string | null): SavedState | null {
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as Record<string, unknown>;

  const settings = sanitizeSettings(raw.settings);
  const mode = TIMER_MODES.includes(raw.mode as TimerMode)
    ? (raw.mode as TimerMode)
    : "work";
  const duration = getDurationSeconds(mode, settings);
  const savedTimeLeft = Number(raw.timeLeft);
  const timeLeft =
    Number.isFinite(savedTimeLeft) && savedTimeLeft > 0
      ? Math.min(duration, Math.floor(savedTimeLeft))
      : duration;
  const savedCount = Number(raw.sessionsCompleted);
  const sessionsCompleted =
    Number.isFinite(savedCount) && savedCount > 0 ? Math.floor(savedCount) : 0;

  return { mode, timeLeft, sessionsCompleted, settings };
}

/**
 * Builds the initial (not yet loaded) state.
 *
 * Returns:
 *   A paused work session using the default settings.
 */
export function createInitialState(): TimerState {
  const timeLeft = getDurationSeconds("work", DEFAULT_SETTINGS);
  return {
    mode: "work",
    timeLeft,
    remainingMs: timeLeft * 1000,
    endTime: null,
    sessionsCompleted: 0,
    settings: DEFAULT_SETTINGS,
    loaded: false,
  };
}

/**
 * Returns a paused state positioned at a given number of seconds.
 *
 * Args:
 *   state: State to copy.
 *   seconds: Remaining seconds to show.
 *
 * Returns:
 *   A paused copy of the state.
 */
function pausedAt(state: TimerState, seconds: number): TimerState {
  return { ...state, timeLeft: seconds, remainingMs: seconds * 1000, endTime: null };
}

/**
 * Reducer for every timer transition.
 *
 * Args:
 *   state: Current state.
 *   action: Transition to apply.
 *
 * Returns:
 *   The next state (the same object when nothing changes).
 */
export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "load": {
      if (!action.saved) return { ...state, loaded: true };
      const { mode, timeLeft, sessionsCompleted, settings } = action.saved;
      // A reload always comes back paused.
      return {
        ...pausedAt(state, timeLeft),
        mode,
        sessionsCompleted,
        settings,
        loaded: true,
      };
    }
    case "start": {
      if (state.endTime !== null || state.remainingMs <= 0) return state;
      return { ...state, endTime: action.now + state.remainingMs };
    }
    case "pause": {
      if (state.endTime === null) return state;
      const remainingMs = Math.max(0, state.endTime - action.now);
      return {
        ...state,
        endTime: null,
        remainingMs,
        timeLeft: toDisplaySeconds(remainingMs),
      };
    }
    case "tick": {
      if (state.endTime === null) return state;
      const timeLeft = toDisplaySeconds(state.endTime - action.now);
      return timeLeft === state.timeLeft ? state : { ...state, timeLeft };
    }
    case "complete": {
      // Ignore stale completions (e.g. a second timer firing for the same run).
      if (state.endTime !== action.endTime) return state;
      const next = getNextSession(
        state.mode,
        state.sessionsCompleted,
        state.settings
      );
      return {
        ...pausedAt(state, getDurationSeconds(next.mode, state.settings)),
        mode: next.mode,
        sessionsCompleted: next.sessionsCompleted,
      };
    }
    case "reset":
      return pausedAt(state, getDurationSeconds(state.mode, state.settings));
    case "resetSessionCount":
      return { ...state, sessionsCompleted: 0 };
    case "updateSettings": {
      const settings = sanitizeSettings({ ...state.settings, ...action.settings });
      const oldDuration = getDurationSeconds(state.mode, state.settings);
      const newDuration = getDurationSeconds(state.mode, settings);
      const untouched =
        state.endTime === null && state.remainingMs === oldDuration * 1000;
      if (untouched) {
        // The current session has not started yet: adopt the new length.
        return { ...pausedAt(state, newDuration), settings };
      }
      if (state.endTime === null && state.remainingMs > newDuration * 1000) {
        // Never leave more time than the session can last.
        return { ...pausedAt(state, newDuration), settings };
      }
      return { ...state, settings };
    }
  }
}
