package com.voltbody.app.domain.usecase

import com.voltbody.app.domain.model.Achievement
import com.voltbody.app.domain.model.WorkoutLog
import java.time.LocalDate
import java.time.format.DateTimeFormatter

// ── Achievements (ported from achievements.ts) ────────────────────────────────

val ACHIEVEMENTS_CATALOG: List<Achievement> = listOf(
    Achievement("first-series",  "Primera serie",        "🏋️", "Registraste tu primera serie. ¡El camino empieza aquí!"),
    Achievement("series-10",    "10 series",             "💪", "Has acumulado 10 series registradas."),
    Achievement("series-50",    "50 series",             "⚡", "50 series completadas. ¡Eso es dedicación!"),
    Achievement("series-100",   "100 series",            "🔥", "100 series. Eres imparable."),
    Achievement("series-500",   "500 series",            "💥", "500 series. Nivel élite."),
    Achievement("streak-3",     "Racha de 3 días",       "🔗", "Entrenaste 3 días seguidos."),
    Achievement("streak-7",     "Racha semanal",         "📅", "7 días de racha. ¡Un hábito de hierro!"),
    Achievement("streak-14",    "Dos semanas seguidas",  "🗓️", "14 días de racha. Consistencia brutal."),
    Achievement("streak-30",    "Racha mensual",         "🏆", "30 días en racha. Eres una bestia."),
    Achievement("pr-beaten",    "Nuevo récord personal", "🥇", "Superaste tu mejor marca en un ejercicio."),
    Achievement("first-100kg",  "100 kg en la barra",    "🦾", "Registraste 100 kg o más en un ejercicio."),
    Achievement("consistency-week", "Semana perfecta",   "✅", "Completaste todos los días de entreno en una semana.")
)

private val DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE

fun computeCurrentStreak(logs: List<WorkoutLog>): Int {
    if (logs.isEmpty()) return 0
    val dateSet = logs.mapNotNull {
        runCatching { LocalDate.parse(it.date.take(10), DATE_FMT).format(DATE_FMT) }.getOrNull()
    }.toSet()
    var streak = 0
    var cursor = LocalDate.now()
    while (dateSet.contains(cursor.format(DATE_FMT))) {
        streak++
        cursor = cursor.minusDays(1)
    }
    return streak
}

fun checkNewAchievements(
    logs: List<WorkoutLog>,
    earnedIds: List<String>,
    exerciseId: String,
    newLogWeight: Float
): List<Achievement> {
    val totalLogs = logs.size
    val streak = computeCurrentStreak(logs)
    val unlocked = mutableListOf<Achievement>()

    fun earn(id: String) {
        if (!earnedIds.contains(id)) {
            ACHIEVEMENTS_CATALOG.firstOrNull { it.id == id }?.let { unlocked.add(it) }
        }
    }

    if (totalLogs >= 1) earn("first-series")
    if (totalLogs >= 10) earn("series-10")
    if (totalLogs >= 50) earn("series-50")
    if (totalLogs >= 100) earn("series-100")
    if (totalLogs >= 500) earn("series-500")
    if (streak >= 3) earn("streak-3")
    if (streak >= 7) earn("streak-7")
    if (streak >= 14) earn("streak-14")
    if (streak >= 30) earn("streak-30")
    if (newLogWeight >= 100f) earn("first-100kg")

    val prevBest = logs.filter { it.exerciseId == exerciseId }.maxOfOrNull { it.weight } ?: 0f
    if (newLogWeight > prevBest && prevBest > 0f) earn("pr-beaten")

    return unlocked
}
