/**
 * haptics.ts
 *
 * Centralized semantic haptic feedback utility inspired by
 * Apple UIFeedbackGenerator and Software Mansion Pulsar Haptics.
 *
 * Works in secure contexts on supported mobile devices (PWA / Android / iOS WebKit).
 */

function vibrate(pattern: number | number[]) {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
}

export const Haptics = {
  /** Ultra-light tap for general navigation and tab switches (~6ms) */
  selection: () => vibrate(6),

  /** Light impact for buttons, switches and quick toggles (~10ms) */
  light: () => vibrate(10),

  /** Medium impact for set completions, adding water, state changes (~20ms) */
  medium: () => vibrate(20),

  /** Heavy impact for finishing a workout, unlocking achievements (~35ms) */
  heavy: () => vibrate(35),

  /** Success notification feedback: quick double tap */
  success: () => vibrate([10, 30, 20]),

  /** Warning notification feedback */
  warning: () => vibrate([20, 50, 20]),

  /** Error / Alert feedback */
  error: () => vibrate([30, 60, 30, 60, 30]),
};
