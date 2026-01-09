"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  sendDiscordNotification,
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
  initAudioContext,
} from "@/lib/notifications";

export type TimerMode = "work" | "shortBreak" | "longBreak";

export interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number; // sessions before long break
  discordNotificationEnabled: boolean; // Discord notification toggle
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  discordNotificationEnabled: false, // Default: disabled
};

export function usePomodoro() {
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);

  // Ref to track if we've loaded from localStorage to avoid overwriting with defaults initially
  const isLoaded = useRef(false);

  // Load state from localStorage on mount and request notification permission
  useEffect(() => {
    const savedState = localStorage.getItem("pomodoro-state");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setMode(parsed.mode || "work");
        setTimeLeft(parsed.timeLeft || DEFAULT_SETTINGS.workDuration * 60);
        setIsActive(false); // Always pause on reload
        setSessionsCompleted(parsed.sessionsCompleted || 0);
        setSettings(parsed.settings || DEFAULT_SETTINGS);
      } catch (e) {
        console.error("Failed to parse timer state", e);
      }
    }
    isLoaded.current = true;

    // Request notification permission
    requestNotificationPermission();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded.current) return;
    const stateToSave = {
      mode,
      timeLeft,
      sessionsCompleted,
      settings,
    };
    localStorage.setItem("pomodoro-state", JSON.stringify(stateToSave));
  }, [mode, timeLeft, sessionsCompleted, settings]);

  const handleTimerComplete = useCallback(() => {
    console.log("handleTimerComplete called, mode:", mode);
    setIsActive(false);

    // Play sound and show notifications
    console.log("Calling playNotificationSound...");
    playNotificationSound();
    console.log("Calling showBrowserNotification...");
    showBrowserNotification(mode, sessionsCompleted);
    // Send Discord notification only if enabled
    if (settings.discordNotificationEnabled) {
      console.log("Calling sendDiscordNotification...");
      sendDiscordNotification(mode, sessionsCompleted);
    } else {
      console.log("Discord notification is disabled, skipping...");
    }

    if (mode === "work") {
      // Calculate NEXT session count to determine break type, but DO NOT increment state yet
      const nextSessionsCompleted = sessionsCompleted + 1;

      if (nextSessionsCompleted % settings.longBreakInterval === 0) {
        setMode("longBreak");
        setTimeLeft(settings.longBreakDuration * 60);
      } else {
        setMode("shortBreak");
        setTimeLeft(settings.shortBreakDuration * 60);
      }
    } else {
      // Break is over, back to work
      // NOW we increment the session count as we start the new focus session
      setSessionsCompleted((prev) => prev + 1);
      setMode("work");
      setTimeLeft(settings.workDuration * 60);
    }
  }, [mode, sessionsCompleted, settings]);

  // Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Timer finished
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, handleTimerComplete]);

  const toggleTimer = () => {
    // Initialize AudioContext on user interaction (required for autoplay policy)
    if (!isActive) {
      initAudioContext();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === "work") {
      setTimeLeft(settings.workDuration * 60);
    } else if (mode === "shortBreak") {
      setTimeLeft(settings.shortBreakDuration * 60);
    } else {
      setTimeLeft(settings.longBreakDuration * 60);
    }
  };

  const skipSession = () => {
    console.log("skipSession called");
    // Initialize AudioContext on user interaction (required for autoplay policy)
    initAudioContext();
    setIsActive(false);
    handleTimerComplete();
  };

  const resetSessionCount = () => {
    setSessionsCompleted(0);
  };

  const updateSettings = (newSettings: Partial<TimerSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  };

  const getTotalDuration = () => {
    if (mode === "work") return settings.workDuration * 60;
    if (mode === "shortBreak") return settings.shortBreakDuration * 60;
    return settings.longBreakDuration * 60;
  };

  return {
    mode,
    timeLeft,
    isActive,
    sessionsCompleted,
    settings,
    totalDuration: getTotalDuration(),
    toggleTimer,
    resetTimer,
    skipSession,
    resetSessionCount,
    updateSettings,
    setMode, // exposed for manual overrides if needed
    setTimeLeft, // exposed for manual overrides if needed
  };
}
