package com.voltbody.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.data.remote.ApiService
import com.voltbody.app.data.remote.dto.ProgressReportRequest
import com.voltbody.app.data.remote.dto.WorkoutLogDto
import com.voltbody.app.data.remote.dto.ProgressPhotoDto
import com.voltbody.app.domain.model.*
import com.voltbody.app.domain.usecase.*
import com.voltbody.app.service.BleHeartRateManager
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale
import javax.inject.Inject
import kotlin.math.roundToInt

data class HomeUiState(
    val hasHydrated: Boolean = false,
    val profile: UserProfile? = null,
    val motivationPhrase: String = "",
    val streak: Int = 0,
    val workoutsThisWeek: Int = 0,
    val totalSeries: Int = 0,
    val level: Int = 1,
    val xp: Int = 0,
    val xpForNext: Int = 100,
    val bmi: String? = null,
    val tdee: String? = null,
    val recoveryScore: Int = 0,
    val recoveryAdvice: RecoveryAdvice? = null,
    val fatigueEntries: List<FatigueEntry> = emptyList(),
    val todayWorkout: WorkoutDay? = null,
    val todayProgress: Int = 0,
    val bleState: String = "disconnected",
    val heartRate: Int? = null,
    val bleDeviceName: String? = null,
    val weightChartData: List<Float?> = emptyList(),
    val weightChartLabels: List<String> = emptyList(),
    val progressReport: ProgressReport? = null,
    val reportLoading: Boolean = false
) {
    data class ProgressReport(
        val overallScore: Int,
        val progressPercent: Int,
        val consistencyPercent: Int,
        val summary: String
    )
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val api: ApiService,
    private val appViewModel: AppViewModel,
    private val bleManager: BleHeartRateManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                appViewModel.hasHydrated,
                appViewModel.profile,
                appViewModel.routine,
                appViewModel.workoutLogs,
                appViewModel.weightLogs,
                appViewModel.recoveryLogs,
                appViewModel.motivationPhrase,
                bleManager.bleState,
                bleManager.heartRate,
                bleManager.deviceName
            ) { args ->
                val hydrated = args[0] as Boolean
                val profile = args[1] as? UserProfile
                val routine = @Suppress("UNCHECKED_CAST")(args[2] as List<WorkoutDay>)
                val workoutLogs = @Suppress("UNCHECKED_CAST")(args[3] as List<WorkoutLog>)
                val weightLogs = @Suppress("UNCHECKED_CAST")(args[4] as List<WeightLog>)
                val recoveryLogs = @Suppress("UNCHECKED_CAST")(args[5] as List<RecoveryLog>)
                val motivationPhrase = args[6] as String
                val bleState = args[7] as String
                val hr = args[8] as? Int
                val bleDevice = args[9] as? String

                val today = LocalDate.now()
                val todayDayIndex = getMondayFirstIndex(today)
                val routineByDay = mapRoutineByWeekday(routine)
                val todayWorkout = routineByDay[todayDayIndex]

                val todayStr = today.format(DateTimeFormatter.ISO_LOCAL_DATE)
                val todayLogs = workoutLogs.filter { it.date.take(10) == todayStr }
                val todayProgress = if (todayWorkout != null) {
                    val totalSets = todayWorkout.exercises.sumOf { maxOf(1, it.sets) }
                    val completedSets = todayWorkout.exercises.sumOf { ex ->
                        workoutLogs.count { log -> log.exerciseId == ex.id && log.date.take(10) == todayStr }.coerceAtMost(ex.sets)
                    }
                    if (totalSets > 0) (completedSets * 100 / totalSets) else 0
                } else 0

                // Streak
                val streak = computeSmartStreak(workoutLogs, routine)

                // Workouts this week
                val wf = WeekFields.of(Locale("es"))
                val monday = today.with(wf.dayOfWeek(), 1).format(DateTimeFormatter.ISO_LOCAL_DATE)
                val sunday = today.with(wf.dayOfWeek(), 7).format(DateTimeFormatter.ISO_LOCAL_DATE)
                val workoutsThisWeek = workoutLogs.count { it.date.take(10) in monday..sunday }

                // XP and level
                val totalSeries = workoutLogs.size
                val xp = totalSeries * 10 + streak * 50
                val level = (xp / 500) + 1
                val xpForNext = level * 500

                // BMI
                val bmi = profile?.let {
                    val hm = it.height / 100f
                    val b = it.weight / (hm * hm)
                    String.format("%.1f", b)
                }

                // TDEE (Mifflin-St Jeor)
                val tdee = profile?.let {
                    val bmr = if (it.gender == "Femenino") {
                        10 * it.weight + 6.25f * it.height - 5 * it.age - 161
                    } else {
                        10 * it.weight + 6.25f * it.height - 5 * it.age + 5
                    }
                    val activityFactor = when (it.trainingDaysPerWeek) {
                        in 0..1 -> 1.2f
                        in 2..3 -> 1.375f
                        in 4..5 -> 1.55f
                        else -> 1.725f
                    }
                    (bmr * activityFactor).roundToInt().toString()
                }

                // Recovery
                val latestRecovery = recoveryLogs.lastOrNull()
                val recoveryAdvice = latestRecovery?.let {
                    if (it.date == todayStr) getRecoveryAdvice(it.score, todayWorkout?.focus) else null
                }

                // Fatigue
                val fatigueEntries = computeFatigueIndex(workoutLogs, routine)

                // Weight chart — 8 weeks
                val weightChartData = (0..7).map { i ->
                    val weekDate = today.minusWeeks((7 - i).toLong())
                    val weekStart = weekDate.with(wf.dayOfWeek(), 1).format(DateTimeFormatter.ISO_LOCAL_DATE)
                    val weekEnd = weekDate.with(wf.dayOfWeek(), 7).format(DateTimeFormatter.ISO_LOCAL_DATE)
                    weightLogs.filter { it.date in weekStart..weekEnd }.maxOfOrNull { it.weight }
                }
                val weightChartLabels = (1..8).map { "S$it" }

                HomeUiState(
                    hasHydrated = hydrated,
                    profile = profile,
                    motivationPhrase = motivationPhrase,
                    streak = streak,
                    workoutsThisWeek = workoutsThisWeek,
                    totalSeries = totalSeries,
                    level = level,
                    xp = xp % 500,
                    xpForNext = 500,
                    bmi = bmi,
                    tdee = tdee,
                    recoveryScore = latestRecovery?.score ?: 0,
                    recoveryAdvice = recoveryAdvice,
                    fatigueEntries = fatigueEntries,
                    todayWorkout = todayWorkout,
                    todayProgress = todayProgress,
                    bleState = bleState,
                    heartRate = hr,
                    bleDeviceName = bleDevice,
                    weightChartData = weightChartData,
                    weightChartLabels = weightChartLabels,
                    progressReport = _uiState.value.progressReport,
                    reportLoading = _uiState.value.reportLoading
                )
            }.collect { state -> _uiState.value = state }
        }
    }

    fun addRecoveryLog(sleepHours: Float, hrv: Float?) {
        val todayStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        val recentLogs = appViewModel.recoveryLogs.value
        val score = computeRecoveryScore(sleepHours, hrv, recentLogs)
        appViewModel.addRecoveryLog(RecoveryLog(date = todayStr, sleepHours = sleepHours, hrv = hrv, score = score))
    }

    fun connectBle() = viewModelScope.launch { bleManager.connect() }
    fun disconnectBle() = bleManager.disconnect()

    fun generateProgressReport() {
        val profile = appViewModel.profile.value ?: return
        val token = appViewModel.authToken.value ?: return
        _uiState.value = _uiState.value.copy(reportLoading = true)

        viewModelScope.launch {
            runCatching {
                api.generateProgressReport(
                    "Bearer $token",
                    ProgressReportRequest(
                        profile = profile,
                        logs = appViewModel.workoutLogs.value.map { WorkoutLogDto(it.date, it.exerciseId, it.weight, it.reps, it.duration, it.rpe, it.rir) },
                        routine = appViewModel.routine.value,
                        diet = appViewModel.diet.value,
                        progressPhotos = appViewModel.progressPhotos.value.map { ProgressPhotoDto(it.date, it.url) }
                    )
                ).body()!!
            }.onSuccess { resp ->
                _uiState.value = _uiState.value.copy(
                    reportLoading = false,
                    progressReport = HomeUiState.ProgressReport(resp.overallScore, resp.progressPercent, resp.consistencyPercent, resp.summary)
                )
            }.onFailure {
                _uiState.value = _uiState.value.copy(reportLoading = false)
            }
        }
    }
}
