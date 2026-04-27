/**
 * recoveryScore.ts
 *
 * Computes a 0–100 Recovery Score from morning HRV and sleep hours.
 *
 * Algorithm:
 *  - Sleep sub-score (0–50): optimal is 8 h. < 5h → 0, > 9.5h → 45 (oversleeping penalty).
 *  - HRV sub-score (0–50): uses a 7-day rolling baseline for that user.
 *    If today's HRV > baseline → bonus; if < baseline → penalty.
 *    Without a baseline, absolute value 20–90 ms is mapped linearly.
 *
 * Recovery tiers:
 *   0–39  → 'low'       (switch to mobility/activation day)
 *   40–64 → 'moderate'  (reduce volume ~20%, keep technique work)
 *   65–84 → 'good'      (normal session)
 *   85–100 → 'optimal'  (push for progressive overload)
 */

export type RecoveryLog = {
  date: string;        // YYYY-MM-DD
  sleepHours: number;  // e.g. 7.5
  hrv?: number;        // Morning HRV in ms (RMSSD). Optional — device may not measure.
  score: number;       // Computed 0-100
};

export type RecoveryTier = 'low' | 'moderate' | 'good' | 'optimal';

/** Compute sleep sub-score 0–50 */
function sleepSubScore(hours: number): number {
  if (hours <= 0) return 0;
  if (hours >= 5 && hours <= 9.5) {
    // Peak at 8h with gentle decline either side
    const delta = Math.abs(hours - 8);
    const score = Math.max(0, 50 - delta * 11);
    return Math.round(score);
  }
  if (hours < 5) return Math.round((hours / 5) * 18);
  // > 9.5h (oversleeping)
  return Math.round(50 - (hours - 9.5) * 10);
}

/**
 * Compute HRV sub-score 0–50.
 *
 * Uses a rolling 7-day average as baseline (if available).
 * Each ms above baseline earns +1 point; each ms below loses -1.5 (asymmetric, as
 * a drop below baseline is more meaningful than a rise).
 */
function hrvSubScore(hrv: number | undefined, recentLogs: RecoveryLog[]): number {
  if (hrv === undefined || hrv <= 0) return 25; // neutral if not measured

  // Build baseline from past 7 logs (not including today)
  const pastHRVs = recentLogs
    .slice(-7)
    .map((l) => l.hrv)
    .filter((v): v is number => v !== undefined && v > 0);

  if (pastHRVs.length >= 3) {
    const baseline = pastHRVs.reduce((a, b) => a + b, 0) / pastHRVs.length;
    const diff = hrv - baseline;
    const raw = 25 + (diff > 0 ? diff * 1 : diff * 1.5);
    return Math.round(Math.max(0, Math.min(50, raw)));
  }

  // No baseline: map absolute value 20–90 ms → 10–50
  const mapped = 10 + ((Math.min(90, Math.max(20, hrv)) - 20) / 70) * 40;
  return Math.round(mapped);
}

/**
 * Compute a single-day Recovery Score (0–100).
 *
 * @param sleepHours  Hours slept last night.
 * @param hrv         Morning HRV (RMSSD, ms). Pass undefined if not available.
 * @param recentLogs  Past recovery logs for HRV baseline calculation.
 */
export function computeRecoveryScore(
  sleepHours: number,
  hrv: number | undefined,
  recentLogs: RecoveryLog[],
): number {
  const sleep = sleepSubScore(sleepHours);
  const hrvScore = hrvSubScore(hrv, recentLogs);
  return Math.round(Math.min(100, Math.max(0, sleep + hrvScore)));
}

export function getRecoveryTier(score: number): RecoveryTier {
  if (score < 40) return 'low';
  if (score < 65) return 'moderate';
  if (score < 85) return 'good';
  return 'optimal';
}

export type RecoveryAdvice = {
  emoji: string;
  title: string;
  subtitle: string;
  intensityLabel: string;
  /** CSS background class for the banner */
  bannerClass: string;
};

export function getRecoveryAdvice(score: number, todayFocus?: string): RecoveryAdvice {
  const tier = getRecoveryTier(score);
  const focusLabel = todayFocus ?? 'sesión de hoy';

  switch (tier) {
    case 'low':
      return {
        emoji: '🛌',
        title: 'Recuperación prioritaria',
        subtitle: `Recovery Score ${score}/100. Convierte ${focusLabel} en movilidad activa y estiramiento. No fuerces intensidad.`,
        intensityLabel: '🔵 Activación / movilidad',
        bannerClass: 'border-blue-500/40 bg-blue-500/10',
      };
    case 'moderate':
      return {
        emoji: '⚠️',
        title: 'Baja el volumen hoy',
        subtitle: `Recovery Score ${score}/100. Reduce el número de series un 20% y prioriza técnica limpia.`,
        intensityLabel: '🟡 Volumen reducido',
        bannerClass: 'border-yellow-500/40 bg-yellow-500/10',
      };
    case 'good':
      return {
        emoji: '✅',
        title: 'Sesión normal',
        subtitle: `Recovery Score ${score}/100. Estás en condiciones para tu ${focusLabel} habitual.`,
        intensityLabel: '🟢 Intensidad normal',
        bannerClass: 'border-emerald-500/40 bg-emerald-500/10',
      };
    case 'optimal':
      return {
        emoji: '🚀',
        title: '¡Día de sobrecarga!',
        subtitle: `Recovery Score ${score}/100. Condición óptima — añade peso o sube el volumen en ${focusLabel}.`,
        intensityLabel: '🔥 Máxima intensidad',
        bannerClass: 'border-[color:var(--app-accent)]/40 bg-[color:var(--app-accent)]/10',
      };
  }
}
