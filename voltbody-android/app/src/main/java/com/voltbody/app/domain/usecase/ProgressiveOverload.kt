package com.voltbody.app.domain.usecase

import com.voltbody.app.domain.model.WorkoutLog

// ── Progressive Overload (ported from progressiveOverload.ts) ─────────────────

data class ProgressiveSuggestion(
    val suggestedWeight: Float,
    val currentWeight: Float,
    val sessionsAnalyzed: Int,
    val increment: Float
)

fun getProgressiveSuggestion(
    exerciseId: String,
    logs: List<WorkoutLog>,
    minSessions: Int = 3
): ProgressiveSuggestion? {
    val exerciseLogs = logs.filter { it.exerciseId == exerciseId }.sortedByDescending { it.date }
    if (exerciseLogs.isEmpty()) return null

    val sessionMap = mutableMapOf<String, MutableList<WorkoutLog>>()
    exerciseLogs.forEach { log ->
        val date = log.date.take(10)
        sessionMap.getOrPut(date) { mutableListOf() }.add(log)
    }

    val sessions = sessionMap.entries.sortedByDescending { it.key }.take(minSessions)
    if (sessions.size < minSessions) return null

    val weights = sessions.map { (_, s) -> s.maxOf { it.weight } }
    if (weights.any { it != weights[0] }) return null

    val currentWeight = weights[0]
    if (currentWeight <= 0f) return null

    val increment = 2.5f
    val suggestedWeight = (Math.round((currentWeight + increment) * 2) / 2).toFloat()
    return ProgressiveSuggestion(suggestedWeight, currentWeight, sessions.size, increment)
}

data class ExerciseSession(
    val date: String,
    val maxWeight: Float,
    val totalVolume: Float,
    val sets: Int,
    val maxReps: Int
)

fun getExerciseHistory(
    exerciseId: String,
    logs: List<WorkoutLog>,
    limit: Int = 15
): List<ExerciseSession> {
    val exerciseLogs = logs.filter { it.exerciseId == exerciseId }
    val sessionMap = mutableMapOf<String, MutableList<WorkoutLog>>()
    exerciseLogs.forEach { log ->
        val date = log.date.take(10)
        sessionMap.getOrPut(date) { mutableListOf() }.add(log)
    }
    return sessionMap.entries
        .sortedBy { it.key }
        .takeLast(limit)
        .map { (date, s) ->
            ExerciseSession(
                date = date,
                maxWeight = s.maxOf { it.weight },
                totalVolume = s.sumOf { it.weight * it.reps }.toFloat(),
                sets = s.size,
                maxReps = s.maxOf { it.reps }
            )
        }
}
