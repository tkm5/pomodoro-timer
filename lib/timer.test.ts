import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  createInitialState,
  formatTime,
  getCycleProgress,
  getNextSession,
  parseSavedState,
  sanitizeSettings,
  timerReducer,
  toDisplaySeconds,
  type TimerAction,
  type TimerState,
} from "./timer";

const T0 = 1_700_000_000_000;

/**
 * Applies a sequence of actions to the loaded initial state.
 *
 * Args:
 *   actions: Actions to apply in order.
 *
 * Returns:
 *   The resulting state.
 */
function run(...actions: TimerAction[]): TimerState {
  return actions.reduce(
    timerReducer,
    timerReducer(createInitialState(), { type: "load", saved: null })
  );
}

describe("toDisplaySeconds / formatTime", () => {
  it("rounds remaining time up and never goes negative", () => {
    expect(toDisplaySeconds(1500_000)).toBe(1500);
    expect(toDisplaySeconds(1499_001)).toBe(1500);
    expect(toDisplaySeconds(1)).toBe(1);
    expect(toDisplaySeconds(0)).toBe(0);
    expect(toDisplaySeconds(-500)).toBe(0);
  });

  it("formats minutes and seconds with padding", () => {
    expect(formatTime(1500)).toEqual({ minutes: "25", seconds: "00" });
    expect(formatTime(65)).toEqual({ minutes: "01", seconds: "05" });
    expect(formatTime(180 * 60)).toEqual({ minutes: "180", seconds: "00" });
  });
});

describe("timestamp-driven countdown", () => {
  it("derives the remaining time from the clock, not from tick count", () => {
    const started = run({ type: "start", now: T0 });
    expect(started.endTime).toBe(T0 + 25 * 60 * 1000);
    // A single late tick (throttled background tab) still shows the right time.
    const later = timerReducer(started, { type: "tick", now: T0 + 10 * 60 * 1000 });
    expect(later.timeLeft).toBe(15 * 60);
  });

  it("returns the same object when the shown second does not change", () => {
    const started = run({ type: "start", now: T0 });
    const ticked = timerReducer(started, { type: "tick", now: T0 + 400 });
    expect(ticked).toBe(started);
  });

  it("pause keeps sub-second precision and resume continues from it", () => {
    const paused = run(
      { type: "start", now: T0 },
      { type: "pause", now: T0 + 1_300 }
    );
    expect(paused.endTime).toBeNull();
    expect(paused.remainingMs).toBe(25 * 60 * 1000 - 1_300);
    expect(paused.timeLeft).toBe(25 * 60 - 1);

    const resumed = timerReducer(paused, { type: "start", now: T0 + 60_000 });
    expect(resumed.endTime).toBe(T0 + 60_000 + 25 * 60 * 1000 - 1_300);
  });

  it("completes the session instead of pausing at 00:00", () => {
    const started = run({ type: "start", now: T0 });
    for (const now of [started.endTime!, started.endTime! + 5_000]) {
      const state = timerReducer(started, { type: "pause", now });
      expect(state.mode).toBe("shortBreak");
      expect(state.endTime).toBeNull();
      expect(state.remainingMs).toBe(5 * 60 * 1000);
      expect(state.timeLeft).toBe(5 * 60);
      // The next session can be started right away.
      const resumed = timerReducer(state, { type: "start", now: now + 1 });
      expect(resumed.endTime).toBe(now + 1 + 5 * 60 * 1000);
    }
  });

  it("pauses normally just before the end", () => {
    const started = run({ type: "start", now: T0 });
    const paused = timerReducer(started, {
      type: "pause",
      now: started.endTime! - 1,
    });
    expect(paused.mode).toBe("work");
    expect(paused.remainingMs).toBe(1);
    expect(paused.timeLeft).toBe(1);
  });

  it("ignores start while running and pause while paused", () => {
    const started = run({ type: "start", now: T0 });
    expect(timerReducer(started, { type: "start", now: T0 + 5_000 })).toBe(started);
    const idle = run();
    expect(timerReducer(idle, { type: "pause", now: T0 })).toBe(idle);
  });

  it("reset stops the timer and restores the full duration", () => {
    const reset = run(
      { type: "start", now: T0 },
      { type: "tick", now: T0 + 90_000 },
      { type: "reset" }
    );
    expect(reset.endTime).toBeNull();
    expect(reset.timeLeft).toBe(25 * 60);
    expect(reset.remainingMs).toBe(25 * 60 * 1000);
  });
});

describe("session transitions", () => {
  it("goes work -> short break -> work and counts after the break", () => {
    let state = run({ type: "start", now: T0 });
    state = timerReducer(state, { type: "complete", endTime: state.endTime });
    expect(state.mode).toBe("shortBreak");
    expect(state.sessionsCompleted).toBe(0);
    expect(state.timeLeft).toBe(5 * 60);
    expect(state.endTime).toBeNull();

    state = timerReducer(state, { type: "complete", endTime: null });
    expect(state.mode).toBe("work");
    expect(state.sessionsCompleted).toBe(1);
  });

  it("ignores a stale completion for a run that already ended", () => {
    const started = run({ type: "start", now: T0 });
    const done = timerReducer(started, {
      type: "complete",
      endTime: started.endTime,
    });
    // Second timer firing for the same run must not skip the break.
    expect(
      timerReducer(done, { type: "complete", endTime: started.endTime })
    ).toBe(done);
  });

  it("takes a long break after every longBreakInterval pomodoros", () => {
    expect(getNextSession("work", 3, DEFAULT_SETTINGS).mode).toBe("longBreak");
    expect(getNextSession("work", 2, DEFAULT_SETTINGS).mode).toBe("shortBreak");
    expect(getNextSession("longBreak", 3, DEFAULT_SETTINGS)).toEqual({
      mode: "work",
      sessionsCompleted: 4,
    });
  });

  it("fills the cycle dots as before", () => {
    expect(getCycleProgress("work", 0, 4)).toBe(0);
    expect(getCycleProgress("shortBreak", 0, 4)).toBe(1);
    expect(getCycleProgress("work", 5, 4)).toBe(1);
    expect(getCycleProgress("longBreak", 3, 4)).toBe(4);
  });
});

describe("settings", () => {
  it("clamps invalid numbers and fills missing keys", () => {
    expect(
      sanitizeSettings({ workDuration: 0, longBreakInterval: -3, shortBreakDuration: 2.6 })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      workDuration: 1,
      longBreakInterval: 1,
      shortBreakDuration: 3,
    });
    expect(sanitizeSettings({ workDuration: 10_000 }).workDuration).toBe(180);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("applies a new duration to a session that has not started", () => {
    const state = run({ type: "updateSettings", settings: { workDuration: 50 } });
    expect(state.timeLeft).toBe(50 * 60);
  });

  it("keeps a running session's end time when the duration grows", () => {
    const started = run({ type: "start", now: T0 });
    const updated = timerReducer(started, {
      type: "updateSettings",
      settings: { workDuration: 50 },
    });
    expect(updated.endTime).toBe(started.endTime);
    expect(updated.settings.workDuration).toBe(50);
    // Pausing does not stretch the session to the new length.
    const paused = timerReducer(updated, { type: "pause", now: T0 + 60_000 });
    expect(paused.remainingMs).toBe(24 * 60 * 1000);
  });

  it("caps a running session to the new duration when it is paused", () => {
    const updated = run(
      { type: "start", now: T0 },
      { type: "updateSettings", settings: { workDuration: 10 } }
    );
    // The run itself is left alone until the user pauses it.
    expect(updated.endTime).toBe(T0 + 25 * 60 * 1000);
    const paused = timerReducer(updated, { type: "pause", now: T0 + 60_000 });
    expect(paused.endTime).toBeNull();
    expect(paused.remainingMs).toBe(10 * 60 * 1000);
    expect(paused.timeLeft).toBe(10 * 60);
  });

  it("caps a paused session that is longer than the new duration", () => {
    const state = run(
      { type: "start", now: T0 },
      { type: "pause", now: T0 + 60_000 },
      { type: "updateSettings", settings: { workDuration: 10 } }
    );
    expect(state.timeLeft).toBe(10 * 60);
  });
});

describe("parseSavedState", () => {
  it("returns null for missing or corrupt data", () => {
    expect(parseSavedState(null)).toBeNull();
    expect(parseSavedState("{oops")).toBeNull();
    expect(parseSavedState("42")).toBeNull();
  });

  it("restores valid data and comes back paused", () => {
    const saved = parseSavedState(
      JSON.stringify({
        mode: "shortBreak",
        timeLeft: 120,
        sessionsCompleted: 3,
        settings: { ...DEFAULT_SETTINGS, shortBreakDuration: 5 },
      })
    );
    expect(saved).toEqual({
      mode: "shortBreak",
      timeLeft: 120,
      sessionsCompleted: 3,
      settings: DEFAULT_SETTINGS,
    });
    const state = timerReducer(createInitialState(), { type: "load", saved });
    expect(state.endTime).toBeNull();
    expect(state.remainingMs).toBe(120_000);
    expect(state.loaded).toBe(true);
  });

  it("repairs unknown modes, old settings and out-of-range time", () => {
    const saved = parseSavedState(
      JSON.stringify({
        mode: "nap",
        timeLeft: 99_999,
        sessionsCompleted: -2,
        settings: { workDuration: 30, longBreakInterval: 0 },
      })
    );
    expect(saved).toEqual({
      mode: "work",
      timeLeft: 30 * 60,
      sessionsCompleted: 0,
      settings: {
        ...DEFAULT_SETTINGS,
        workDuration: 30,
        longBreakInterval: 1,
      },
    });
  });
});
