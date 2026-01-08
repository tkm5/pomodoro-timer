/**
 * Notification utilities for Pomodoro Timer.
 *
 * This module provides functions for Discord webhook notifications,
 * browser notifications, and sound alerts.
 */

export type NotificationMode = "work" | "shortBreak" | "longBreak";

// Singleton AudioContext instance
let audioContext: AudioContext | null = null;

/**
 * Initializes the AudioContext on user interaction.
 * Must be called from a user gesture (click, etc.) to comply with autoplay policy.
 */
export function initAudioContext(): void {
  if (typeof window === "undefined") return;

  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    console.log("AudioContext created:", audioContext.state);
  }

  // Resume if suspended (required by some browsers)
  if (audioContext.state === "suspended") {
    audioContext.resume().then(() => {
      console.log("AudioContext resumed:", audioContext?.state);
    });
  }
}

/**
 * Sends a notification to Discord via API route to avoid CORS issues.
 *
 * @param mode - The timer mode that was completed.
 * @param sessionsCompleted - The number of pomodoro sessions completed.
 */
export async function sendDiscordNotification(
  mode: NotificationMode,
  sessionsCompleted: number
): Promise<void> {
  const modeMessages: Record<NotificationMode, string> = {
    work: `🍅 ポモドーロ #${sessionsCompleted + 1} が完了しました！休憩時間です．`,
    shortBreak: `☕ 短い休憩が終わりました．集中タイムを始めましょう！`,
    longBreak: `🎉 長い休憩が終わりました．新しいサイクルを始めましょう！`,
  };

  const payload = {
    content: modeMessages[mode],
    username: "Pomodoro Timer",
  };

  try {
    console.log("Sending Discord notification...", payload);
    const response = await fetch("/api/discord", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log("Discord notification response:", response.status, result);
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

/**
 * Plays a gentle notification sound using Web Audio API.
 */
export function playNotificationSound(): void {
  console.log("playNotificationSound called, audioContext:", audioContext?.state);
  try {
    // Initialize AudioContext if not already done
    if (!audioContext) {
      console.log("AudioContext not initialized, initializing now...");
      initAudioContext();
    }

    if (!audioContext) {
      console.warn("AudioContext not available");
      return;
    }

    // Resume if suspended
    if (audioContext.state === "suspended") {
      console.log("AudioContext suspended, resuming...");
      audioContext.resume();
    }

    console.log("Playing sound, AudioContext state:", audioContext.state);
    const ctx = audioContext;

    // Create a gentle chime sound
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Gentle envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(
        0.3,
        ctx.currentTime + startTime + 0.05
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + startTime + duration
      );

      oscillator.start(ctx.currentTime + startTime);
      oscillator.stop(ctx.currentTime + startTime + duration);
    };

    // Play a gentle three-note chime (C5 - E5 - G5)
    playTone(523.25, 0, 0.5); // C5
    playTone(659.25, 0.15, 0.5); // E5
    playTone(783.99, 0.3, 0.7); // G5
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

/**
 * Requests permission for browser notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Shows a browser notification.
 *
 * @param mode - The timer mode that was completed.
 * @param sessionsCompleted - The number of pomodoro sessions completed.
 */
export function showBrowserNotification(
  mode: NotificationMode,
  sessionsCompleted: number
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const titles: Record<NotificationMode, string> = {
    work: "ポモドーロ完了！",
    shortBreak: "休憩終了！",
    longBreak: "長い休憩終了！",
  };

  const bodies: Record<NotificationMode, string> = {
    work: `ポモドーロ #${sessionsCompleted + 1} が完了しました．休憩しましょう！`,
    shortBreak: "集中タイムを始めましょう！",
    longBreak: "新しいサイクルを始めましょう！",
  };

  try {
    new Notification(titles[mode], {
      body: bodies[mode],
      icon: "/favicon.ico",
      tag: "pomodoro-timer",
    });
  } catch (error) {
    console.error("Failed to show browser notification:", error);
  }
}
