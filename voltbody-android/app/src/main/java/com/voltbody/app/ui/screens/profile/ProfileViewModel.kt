package com.voltbody.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.domain.model.*
import com.voltbody.app.domain.usecase.ACHIEVEMENTS_CATALOG
import com.voltbody.app.domain.usecase.computeSmartStreak
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale
import javax.inject.Inject

// ── Extra model types for Profile ─────────────────────────────────────────────

data class PersonalRecord(
    val exerciseName: String,
    val weight: Float,
    val reps: Int,
    val date: String
)

data class FitnessStats(
    /** Derived from total workout log count (capped at 100) */
    val strength: Int,
    /** Derived from weekly goals completion percentage */
    val consistency: Int,
    /** Derived from weight log frequency (capped at 100, min 30) */
    val energy: Int
)

// ── UI State ──────────────────────────────────────────────────────────────────

data class ProfileUiState(
    val profile: UserProfile? = null,
    val profilePhoto: String? = null,
    val theme: AppTheme = AppTheme.VERDE_NEGRO,
    val level: Int = 1,
    val xp: Int = 0,
    val streak: Int = 0,
    val lastWeightLog: Float? = null,
    val weightLogHistory: List<WeightLog> = emptyList(),
    val achievements: List<Achievement> = emptyList(),
    val weeklyGoals: List<WeeklyGoal> = emptyList(),
    val notificationsEnabled: Boolean = false,
    val progressPhotos: List<ProgressPhoto> = emptyList(),
    val personalRecords: List<PersonalRecord> = emptyList(),
    val motivationPhrase: String = "Cada serie te acerca más a tu meta. ¡No pares!",
    val motivationPhoto: String? = null,
    val fitnessStats: FitnessStats = FitnessStats(0, 0, 30)
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val appViewModel: AppViewModel
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                appViewModel.profile,
                appViewModel.profilePhoto,
                appViewModel.theme,
                appViewModel.workoutLogs,
                appViewModel.weightLogs,
                appViewModel.routine,
                appViewModel.achievements,
                appViewModel.weeklyGoals,
                appViewModel.notificationsEnabled
            ) { args ->
                val profile = args[0] as? UserProfile
                val profilePhoto = args[1] as? String
                val theme = args[2] as AppTheme
                @Suppress("UNCHECKED_CAST") val logs = args[3] as List<WorkoutLog>
                @Suppress("UNCHECKED_CAST") val weightLogs = args[4] as List<WeightLog>
                @Suppress("UNCHECKED_CAST") val routine = args[5] as List<WorkoutDay>
                @Suppress("UNCHECKED_CAST") val achievements = args[6] as List<Achievement>
                @Suppress("UNCHECKED_CAST") val weeklyGoals = args[7] as List<WeeklyGoal>
                val notificationsEnabled = args[8] as Boolean

                val xp = logs.size * 10 + computeSmartStreak(logs, routine) * 50
                val level = (xp / 500) + 1
                val streak = computeSmartStreak(logs, routine)
                val lastWeightLog = weightLogs.lastOrNull()?.weight

                // Merge catalog with earned achievements
                val mergedAchievements = ACHIEVEMENTS_CATALOG.map { catalogItem ->
                    achievements.firstOrNull { it.id == catalogItem.id } ?: catalogItem
                }

                // Personal records — best weight per exercise
                val exerciseNames = buildMap<String, String> {
                    for (day in routine) {
                        for (ex in day.exercises) put(ex.id, ex.name)
                    }
                }
                val prMap = mutableMapOf<String, PersonalRecord>()
                for (log in logs) {
                    val existing = prMap[log.exerciseId]
                    if (log.weight > 0 && (existing == null || log.weight > existing.weight)) {
                        prMap[log.exerciseId] = PersonalRecord(
                            exerciseName = exerciseNames[log.exerciseId] ?: log.exerciseId,
                            weight = log.weight,
                            reps = log.reps,
                            date = log.date.take(10)
                        )
                    }
                }
                val personalRecords = prMap.values
                    .sortedByDescending { it.weight }
                    .take(10)

                // Fitness stats
                val completedGoals = weeklyGoals.count { it.done }
                val consistencyScore = if (weeklyGoals.isEmpty()) 0
                    else ((completedGoals.toFloat() / weeklyGoals.size) * 100).toInt()
                val fitnessStats = FitnessStats(
                    strength = minOf(100, logs.size * 4),
                    consistency = consistencyScore,
                    energy = minOf(100, maxOf(30, weightLogs.size * 18))
                )

                _uiState.value.copy(
                    profile = profile,
                    profilePhoto = profilePhoto,
                    theme = theme,
                    level = level,
                    xp = xp % 500,
                    streak = streak,
                    lastWeightLog = lastWeightLog,
                    weightLogHistory = weightLogs.takeLast(6).reversed(),
                    achievements = mergedAchievements,
                    weeklyGoals = weeklyGoals,
                    notificationsEnabled = notificationsEnabled,
                    personalRecords = personalRecords,
                    fitnessStats = fitnessStats
                )
            }.collect { _uiState.value = it }
        }

        // Progress photos
        viewModelScope.launch {
            appViewModel.progressPhotos.collect { photos ->
                _uiState.value = _uiState.value.copy(progressPhotos = photos)
            }
        }

        // Motivation phrase + photo
        viewModelScope.launch {
            combine(appViewModel.motivationPhrase, appViewModel.motivationPhoto) { phrase, photo ->
                _uiState.value = _uiState.value.copy(motivationPhrase = phrase, motivationPhoto = photo)
            }.collect {}
        }
    }

    fun pickPhoto() {
        // Photo picking is handled in ProfileScreen via rememberLauncherForActivityResult
    }

    fun setProfilePhotoUri(uriString: String) {
        appViewModel.setProfilePhoto(uriString)
    }

    fun addProgressPhotoUri(uriString: String) {
        val date = java.time.Instant.now().toString()
        appViewModel.addProgressPhoto(ProgressPhoto(date = date, url = uriString))
        appViewModel.showToast(AppToast("progress_photo", ToastType.SUCCESS, "Foto añadida", "Foto de progreso guardada"))
    }

    fun addWeightLog(weight: Float) {
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        appViewModel.addWeightLog(WeightLog(today, weight))
        appViewModel.profile.value?.let { appViewModel.updateProfile(it.copy(weight = weight)) }
        appViewModel.showToast(AppToast("weight_log", ToastType.SUCCESS, "Peso registrado", "${String.format("%.1f", weight)} kg"))
    }

    fun updateProfileDimensions(weight: Float, height: Float) {
        appViewModel.profile.value?.let {
            appViewModel.updateProfile(it.copy(weight = weight, height = height))
        }
        appViewModel.showToast(AppToast("profile_updated", ToastType.SUCCESS, "Perfil actualizado"))
    }

    fun setMotivationPhrase(phrase: String) = appViewModel.setMotivationPhrase(phrase)

    fun setMotivationPhoto(uriString: String?) = appViewModel.setMotivationPhoto(uriString)

    fun setTheme(theme: AppTheme) = appViewModel.setTheme(theme)

    fun toggleGoal(id: String) = appViewModel.toggleWeeklyGoal(id)

    fun toggleNotifications(enabled: Boolean) = appViewModel.setNotificationsEnabled(enabled)

    fun logout() = appViewModel.logout()
}
