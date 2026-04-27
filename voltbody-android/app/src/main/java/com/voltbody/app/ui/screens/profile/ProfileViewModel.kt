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
import javax.inject.Inject

data class ProfileUiState(
    val profile: UserProfile? = null,
    val profilePhoto: String? = null,
    val theme: AppTheme = AppTheme.VERDE_NEGRO,
    val level: Int = 1,
    val xp: Int = 0,
    val streak: Int = 0,
    val lastWeightLog: Float? = null,
    val achievements: List<Achievement> = emptyList(),
    val weeklyGoals: List<WeeklyGoal> = emptyList(),
    val notificationsEnabled: Boolean = false
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

                ProfileUiState(
                    profile = profile,
                    profilePhoto = profilePhoto,
                    theme = theme,
                    level = level,
                    xp = xp % 500,
                    streak = streak,
                    lastWeightLog = lastWeightLog,
                    achievements = mergedAchievements,
                    weeklyGoals = weeklyGoals,
                    notificationsEnabled = notificationsEnabled
                )
            }.collect { _uiState.value = it }
        }
    }

    fun pickPhoto() {
        // Photo picking is handled by MainActivity via ActivityResultContracts
        // This is a stub — the activity will call setProfilePhoto when done
    }

    fun addWeightLog(weight: Float) {
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        appViewModel.addWeightLog(WeightLog(today, weight))
        // Also update profile weight
        appViewModel.profile.value?.let { appViewModel.updateProfile(it.copy(weight = weight)) }
        appViewModel.showToast(AppToast("weight_log", ToastType.SUCCESS, "Peso registrado", "${String.format("%.1f", weight)} kg"))
    }

    fun setTheme(theme: AppTheme) = appViewModel.setTheme(theme)

    fun toggleGoal(id: String) = appViewModel.toggleWeeklyGoal(id)

    fun toggleNotifications(enabled: Boolean) = appViewModel.setNotificationsEnabled(enabled)

    fun logout() = appViewModel.logout()
}
