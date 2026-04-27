package com.voltbody.app.domain.usecase

import com.voltbody.app.domain.model.RecoveryLog

// ── Recovery Score (ported from recoveryScore.ts) ─────────────────────────────

enum class RecoveryTier { LOW, MODERATE, GOOD, OPTIMAL }

data class RecoveryAdvice(
    val emoji: String,
    val title: String,
    val subtitle: String,
    val intensityLabel: String
)

private fun sleepSubScore(hours: Float): Int {
    if (hours <= 0f) return 0
    if (hours in 5f..9.5f) {
        val delta = Math.abs(hours - 8f)
        return maxOf(0, (50 - delta * 11).toInt())
    }
    if (hours < 5f) return ((hours / 5f) * 18).toInt()
    // > 9.5h oversleeping
    return maxOf(0, (50 - (hours - 9.5f) * 10).toInt())
}

private fun hrvSubScore(hrv: Float?, recentLogs: List<RecoveryLog>): Int {
    if (hrv == null || hrv <= 0f) return 25 // neutral if not measured

    val pastHRVs = recentLogs.takeLast(7).mapNotNull { it.hrv }.filter { it > 0f }

    if (pastHRVs.size >= 3) {
        val baseline = pastHRVs.average().toFloat()
        val diff = hrv - baseline
        val raw = 25 + if (diff > 0) diff * 1f else diff * 1.5f
        return maxOf(0, minOf(50, raw.toInt()))
    }

    val mapped = 10 + ((minOf(90f, maxOf(20f, hrv)) - 20f) / 70f) * 40f
    return mapped.toInt()
}

fun computeRecoveryScore(
    sleepHours: Float,
    hrv: Float?,
    recentLogs: List<RecoveryLog>
): Int {
    val sleep = sleepSubScore(sleepHours)
    val hrvScore = hrvSubScore(hrv, recentLogs)
    return minOf(100, maxOf(0, sleep + hrvScore))
}

fun getRecoveryTier(score: Int): RecoveryTier = when {
    score < 40 -> RecoveryTier.LOW
    score < 65 -> RecoveryTier.MODERATE
    score < 85 -> RecoveryTier.GOOD
    else -> RecoveryTier.OPTIMAL
}

fun getRecoveryAdvice(score: Int, todayFocus: String? = null): RecoveryAdvice {
    val focus = todayFocus ?: "sesión de hoy"
    return when (getRecoveryTier(score)) {
        RecoveryTier.LOW -> RecoveryAdvice(
            emoji = "🛌",
            title = "Recuperación prioritaria",
            subtitle = "Recovery Score $score/100. Convierte $focus en movilidad activa y estiramiento. No fuerces intensidad.",
            intensityLabel = "🔵 Activación / movilidad"
        )
        RecoveryTier.MODERATE -> RecoveryAdvice(
            emoji = "⚠️",
            title = "Baja el volumen hoy",
            subtitle = "Recovery Score $score/100. Reduce el número de series un 20% y prioriza técnica limpia.",
            intensityLabel = "🟡 Volumen reducido"
        )
        RecoveryTier.GOOD -> RecoveryAdvice(
            emoji = "✅",
            title = "Sesión normal",
            subtitle = "Recovery Score $score/100. Estás en condiciones para tu $focus habitual.",
            intensityLabel = "🟢 Intensidad normal"
        )
        RecoveryTier.OPTIMAL -> RecoveryAdvice(
            emoji = "🚀",
            title = "¡Día de sobrecarga!",
            subtitle = "Recovery Score $score/100. Condición óptima — añade peso o sube el volumen en $focus.",
            intensityLabel = "🔥 Máxima intensidad"
        )
    }
}
