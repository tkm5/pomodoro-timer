/**
 * Notification utilities for Pomodoro Timer.
 *
 * This module provides functions for Discord webhook notifications,
 * browser notifications, and sound alerts.
 */

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1458808624108409027/KPd5kWqMibHlllNlGFO8T49hsl6D7_o8IcxcjvaITk8u7vn1Aff8ML3XqlkSTmwwlyEi";

export type NotificationMode = "work" | "shortBreak" | "longBreak";

/**
 * Sends a notification to Discord via webhook.
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
    avatar_url:
      "https://cdn.discordapp.com/attachments/1234567890/pomodoro-icon.png",
  };

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

/**
 * Plays a gentle notification sound using Web Audio API.
 */
export function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    // Create a gentle chime sound
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

      // Gentle envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(
        0.3,
        audioContext.currentTime + startTime + 0.05
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + startTime + duration
      );

      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
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
