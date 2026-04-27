package com.voltbody.app.domain.usecase

import com.voltbody.app.domain.model.WorkoutDay
import com.voltbody.app.domain.model.WorkoutLog
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale

// ── Fatigue Index (ported from fatigueIndex.ts) ───────────────────────────────

val MRV_DEFAULTS = mapOf(
    "Pecho" to 20,
    "Espalda" to 25,
    "Hombros" to 20,
    "Piernas" to 22,
    "Bíceps" to 20,
    "Tríceps" to 20,
    "Core" to 25,
    "Calistenia" to 18,
    "Glúteos" to 20,
    "Cardio" to 5
)
private const val DEFAULT_MRV = 18

enum class FatigueStatus { FRESH, MODERATE, HIGH, OVERREACHED }

data class FatigueEntry(
    val muscleGroup: String,
    val weeklyVolume: Int,
    val mrv: Int,
    val percent: Int,
    val status: FatigueStatus
)

fun fatigueStatusLabel(status: FatigueStatus) = when (status) {
    FatigueStatus.FRESH -> "🟢 Fresco"
    FatigueStatus.MODERATE -> "🟡 Moderado"
    FatigueStatus.HIGH -> "🟠 Alto"
    FatigueStatus.OVERREACHED -> "🔴 Sobreentrenado"
}

fun computeFatigueIndex(
    logs: List<WorkoutLog>,
    routine: List<WorkoutDay>,
    weekStart: LocalDate = LocalDate.now()
): List<FatigueEntry> {
    val wf = WeekFields.of(Locale("es"))
    val monday = weekStart.with(wf.dayOfWeek(), 1)
    val sunday = monday.plusDays(6)
    val fromKey = monday.format(DateTimeFormatter.ISO_LOCAL_DATE)
    val toKey = sunday.format(DateTimeFormatter.ISO_LOCAL_DATE)

    val muscleMap = buildMap {
        for (day in routine) {
            for (ex in day.exercises) {
                if (ex.id.isNotEmpty() && ex.muscleGroup.isNotEmpty()) put(ex.id, ex.muscleGroup)
            }
        }
    }

    val setsByMuscle = mutableMapOf<String, Int>()
    for (log in logs) {
        val dateKey = log.date.take(10)
        if (dateKey < fromKey || dateKey > toKey) continue
        val muscle = muscleMap[log.exerciseId] ?: continue
        setsByMuscle[muscle] = (setsByMuscle[muscle] ?: 0) + 1
    }

    return setsByMuscle.map { (muscle, sets) ->
        val mrv = MRV_DEFAULTS[muscle] ?: DEFAULT_MRV
        val percent = ((sets.toFloat() / mrv) * 100).toInt()
        val status = when {
            percent < 50 -> FatigueStatus.FRESH
            percent < 75 -> FatigueStatus.MODERATE
            percent < 100 -> FatigueStatus.HIGH
            else -> FatigueStatus.OVERREACHED
        }
        FatigueEntry(muscle, sets, mrv, percent, status)
    }.sortedByDescending { it.percent }
}
