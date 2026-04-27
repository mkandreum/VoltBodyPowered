package com.voltbody.app.domain.usecase

import com.voltbody.app.domain.model.WorkoutDay
import com.voltbody.app.domain.model.WorkoutLog
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter

// ── Routine week helpers (ported from routineWeek.ts) ─────────────────────────

val WEEKDAY_LABELS = listOf(
    Triple("lun", "Lun", "Lunes"),
    Triple("mar", "Mar", "Martes"),
    Triple("mie", "Mie", "Miércoles"),
    Triple("jue", "Jue", "Jueves"),
    Triple("vie", "Vie", "Viernes"),
    Triple("sab", "Sab", "Sábado"),
    Triple("dom", "Dom", "Domingo")
)

fun getMondayFirstIndex(date: LocalDate): Int {
    return when (date.dayOfWeek) {
        DayOfWeek.MONDAY -> 0
        DayOfWeek.TUESDAY -> 1
        DayOfWeek.WEDNESDAY -> 2
        DayOfWeek.THURSDAY -> 3
        DayOfWeek.FRIDAY -> 4
        DayOfWeek.SATURDAY -> 5
        DayOfWeek.SUNDAY -> 6
    }
}

private fun normalizeText(value: String): String =
    value.lowercase()
        .normalize()
        .trim()

private fun String.normalize(): String {
    val normalized = java.text.Normalizer.normalize(this, java.text.Normalizer.Form.NFD)
    return normalized.replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
}

private fun getWeekdayIndexFromName(dayName: String): Int {
    val n = normalizeText(dayName)
    return when {
        n.contains("lun") -> 0
        n.contains("mar") -> 1
        n.contains("mie") -> 2
        n.contains("jue") -> 3
        n.contains("vie") -> 4
        n.contains("sab") -> 5
        n.contains("dom") -> 6
        else -> -1
    }
}

fun mapRoutineByWeekday(routine: List<WorkoutDay>): Array<WorkoutDay?> {
    val mapped = arrayOfNulls<WorkoutDay>(7)
    val unresolved = mutableListOf<WorkoutDay>()

    routine.forEach { day ->
        val idx = getWeekdayIndexFromName(day.day)
        if (idx >= 0 && mapped[idx] == null) {
            mapped[idx] = day
        } else {
            unresolved.add(day)
        }
    }

    unresolved.forEach { day ->
        val freeIdx = mapped.indexOfFirst { it == null }
        if (freeIdx >= 0) mapped[freeIdx] = day
    }

    return mapped
}

private const val MAX_STREAK_DAYS = 365
private val DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE

fun computeSmartStreak(logs: List<WorkoutLog>, routine: List<WorkoutDay>): Int {
    if (logs.isEmpty()) return 0

    val routineByDay = mapRoutineByWeekday(routine)
    val workoutWeekdays = routineByDay
        .mapIndexed { i, d -> if (d != null) i else -1 }
        .filter { it >= 0 }
        .toSet()

    val dateSet = logs
        .mapNotNull { runCatching { LocalDate.parse(it.date.take(10), DATE_FMT) }.getOrNull() }
        .map { it.format(DATE_FMT) }
        .toSet()

    val today = LocalDate.now()
    val todayStr = today.format(DATE_FMT)
    var streak = 0
    var cursor = today

    repeat(MAX_STREAK_DAYS) {
        val dateStr = cursor.format(DATE_FMT)
        val weekdayIndex = getMondayFirstIndex(cursor)
        val isWorkoutDay = workoutWeekdays.isEmpty() || workoutWeekdays.contains(weekdayIndex)

        if (isWorkoutDay) {
            when {
                dateSet.contains(dateStr) -> streak++
                dateStr == todayStr -> { /* today not done yet — don't break */ }
                else -> return streak // missed past workout day
            }
        }
        cursor = cursor.minusDays(1)
    }

    return streak
}
