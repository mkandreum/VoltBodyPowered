package com.voltbody.app.ui.screens.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.domain.model.*
import com.voltbody.app.domain.usecase.*
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.Instant
import javax.inject.Inject

data class WorkoutUiState(
    val routine: List<WorkoutDay> = emptyList(),
    val selectedDayIndex: Int = 0,
    val currentWorkoutDay: WorkoutDay? = null,
    val completedDays: Set<Int> = emptySet(),
    val completedSets: Map<String, Int> = emptyMap(),
    val dayProgress: Int = 0,
    val sessionRunning: Boolean = false,
    val sessionElapsed: Int = 0,
    val restSecondsLeft: Int = 0,
    val logSheetExercise: Exercise? = null,
    val lastWeightForExercise: Map<String, Float> = emptyMap(),
    val progressiveSuggestions: Map<String, ProgressiveSuggestion> = emptyMap(),
    val workoutComplete: Boolean = false,
    val todaySetsLogged: Int = 0,
    val currentStreak: Int = 0,
    val userName: String? = null
)

@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val appViewModel: AppViewModel
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutUiState())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private var sessionTimerJob: Job? = null
    private var restTimerJob: Job? = null

    init {
        viewModelScope.launch {
            combine(
                appViewModel.routine,
                appViewModel.workoutLogs,
                appViewModel.user
            ) { routine, logs, user ->
                val today = LocalDate.now()
                val todayDayIndex = getMondayFirstIndex(today)

                val routineByDay = mapRoutineByWeekday(routine)

                // Which days are completed this week
                val completedDays = mutableSetOf<Int>()
                routineByDay.forEachIndexed { i, day ->
                    if (day != null) {
                        val dayDate = today.with(java.time.DayOfWeek.MONDAY).plusDays(i.toLong())
                        val dayStr = dayDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
                        val dayLogs = logs.filter { it.date.take(10) == dayStr }
                        val completedSets = day.exercises.sumOf { ex ->
                            dayLogs.count { it.exerciseId == ex.id }
                        }
                        if (completedSets >= day.exercises.sumOf { it.sets } * 0.8) {
                            completedDays.add(i)
                        }
                    }
                }

                val selectedDay = _uiState.value.selectedDayIndex
                val currentDay = routineByDay[selectedDay]
                val todayStr = today.format(DateTimeFormatter.ISO_LOCAL_DATE)
                val todayLogs = logs.filter { it.date.take(10) == todayStr }

                // Completed sets for today
                val completedSetsMap = currentDay?.exercises?.associate { ex ->
                    ex.id to todayLogs.count { it.exerciseId == ex.id }.coerceAtMost(ex.sets)
                } ?: emptyMap()

                // Day progress
                val totalSets = currentDay?.exercises?.sumOf { it.sets } ?: 0
                val doneSets = completedSetsMap.values.sum()
                val dayProgress = if (totalSets > 0) (doneSets * 100 / totalSets) else 0

                // Last weight per exercise
                val lastWeightMap = currentDay?.exercises?.associate { ex ->
                    ex.id to (logs.filter { it.exerciseId == ex.id }.maxOfOrNull { it.weight } ?: ex.weight)
                } ?: emptyMap()

                // Progressive overload suggestions
                val suggestions = currentDay?.exercises?.mapNotNull { ex ->
                    getProgressiveSuggestion(ex.id, logs)?.let { ex.id to it }
                }?.toMap() ?: emptyMap()

                val workoutComplete = dayProgress >= 80 && todayLogs.isNotEmpty()
                val todaySetsLogged = todayLogs.size

                // Smart streak
                val streak = computeSmartStreak(logs, routine)

                _uiState.value.copy(
                    routine = routine,
                    currentWorkoutDay = currentDay,
                    completedDays = completedDays,
                    completedSets = completedSetsMap,
                    dayProgress = dayProgress,
                    lastWeightForExercise = lastWeightMap,
                    progressiveSuggestions = suggestions,
                    workoutComplete = workoutComplete,
                    todaySetsLogged = todaySetsLogged,
                    currentStreak = streak,
                    userName = user?.name
                )
            }.collect { state -> _uiState.value = state }
        }
    }

    fun selectDay(dayIndex: Int) {
        _uiState.value = _uiState.value.copy(selectedDayIndex = dayIndex)
    }

    fun startSession() {
        if (_uiState.value.sessionRunning) return
        _uiState.value = _uiState.value.copy(sessionRunning = true, sessionElapsed = 0)
        sessionTimerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.value = _uiState.value.copy(sessionElapsed = _uiState.value.sessionElapsed + 1)
            }
        }
    }

    fun openLogSheet(exercise: Exercise) {
        _uiState.value = _uiState.value.copy(logSheetExercise = exercise)
    }

    fun closeLogSheet() {
        _uiState.value = _uiState.value.copy(logSheetExercise = null)
    }

    fun logSet(exercise: Exercise, weight: Float, reps: Int, rir: Int?, sets: Int, duration: Int?, rpe: Int?) {
        val now = Instant.now().toString()
        repeat(sets) {
            appViewModel.addWorkoutLog(
                WorkoutLog(
                    date = now,
                    exerciseId = exercise.id,
                    weight = weight,
                    reps = reps,
                    duration = duration,
                    rpe = rpe,
                    rir = rir
                )
            )
        }
        closeLogSheet()
        startRestTimer(90)
        appViewModel.showToast(AppToast(
            id = "set_logged",
            type = ToastType.SUCCESS,
            title = "Serie registrada",
            message = "${exercise.name} · ${if (weight > 0) "${weight}kg × " else ""}${reps} reps"
        ))
    }

    private fun startRestTimer(seconds: Int) {
        restTimerJob?.cancel()
        _uiState.value = _uiState.value.copy(restSecondsLeft = seconds)
        restTimerJob = viewModelScope.launch {
            for (remaining in seconds downTo 0) {
                _uiState.value = _uiState.value.copy(restSecondsLeft = remaining)
                if (remaining == 0) break
                delay(1000)
            }
        }
    }

    fun skipRest() {
        restTimerJob?.cancel()
        _uiState.value = _uiState.value.copy(restSecondsLeft = 0)
    }

    override fun onCleared() {
        sessionTimerJob?.cancel()
        restTimerJob?.cancel()
        super.onCleared()
    }
}
