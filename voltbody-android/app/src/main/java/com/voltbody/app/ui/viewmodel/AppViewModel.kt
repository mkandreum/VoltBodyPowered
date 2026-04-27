package com.voltbody.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.data.local.dao.*
import com.voltbody.app.data.local.entities.*
import com.voltbody.app.data.preferences.AppPreferences
import com.voltbody.app.data.remote.ApiService
import com.voltbody.app.data.remote.dto.*
import com.voltbody.app.domain.model.*
import com.voltbody.app.domain.usecase.checkNewAchievements
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject

// ── App-level shared state ─────────────────────────────────────────────────────

@HiltViewModel
class AppViewModel @Inject constructor(
    private val api: ApiService,
    private val prefs: AppPreferences,
    private val workoutLogDao: WorkoutLogDao,
    private val weightLogDao: WeightLogDao,
    private val recoveryLogDao: RecoveryLogDao,
    private val progressPhotoDao: ProgressPhotoDao
) : ViewModel() {

    // ── Auth state ────────────────────────────────────────────────────────────

    private val _authToken = MutableStateFlow<String?>(null)
    val authToken: StateFlow<String?> = _authToken.asStateFlow()

    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _isOnboarded = MutableStateFlow(false)
    val isOnboarded: StateFlow<Boolean> = _isOnboarded.asStateFlow()

    private val _hasHydrated = MutableStateFlow(false)
    val hasHydrated: StateFlow<Boolean> = _hasHydrated.asStateFlow()

    // ── Profile data ──────────────────────────────────────────────────────────

    private val _profile = MutableStateFlow<UserProfile?>(null)
    val profile: StateFlow<UserProfile?> = _profile.asStateFlow()

    private val _routine = MutableStateFlow<List<WorkoutDay>>(emptyList())
    val routine: StateFlow<List<WorkoutDay>> = _routine.asStateFlow()

    private val _diet = MutableStateFlow<DietPlan?>(null)
    val diet: StateFlow<DietPlan?> = _diet.asStateFlow()

    private val _insights = MutableStateFlow<Insights?>(null)
    val insights: StateFlow<Insights?> = _insights.asStateFlow()

    private val _theme = MutableStateFlow(AppTheme.VERDE_NEGRO)
    val theme: StateFlow<AppTheme> = _theme.asStateFlow()

    private val _motivationPhrase = MutableStateFlow("Cada serie te acerca más a tu meta. ¡No pares!")
    val motivationPhrase: StateFlow<String> = _motivationPhrase.asStateFlow()

    private val _motivationPhoto = MutableStateFlow<String?>(null)
    val motivationPhoto: StateFlow<String?> = _motivationPhoto.asStateFlow()

    private val _profilePhoto = MutableStateFlow<String?>(null)
    val profilePhoto: StateFlow<String?> = _profilePhoto.asStateFlow()

    private val _notificationsEnabled = MutableStateFlow(false)
    val notificationsEnabled: StateFlow<Boolean> = _notificationsEnabled.asStateFlow()

    // ── Logs (from Room DB) ───────────────────────────────────────────────────

    val workoutLogs: StateFlow<List<WorkoutLog>> =
        workoutLogDao.getAllFlow()
            .map { entities -> entities.map { it.toDomain() } }
            .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val weightLogs: StateFlow<List<WeightLog>> =
        weightLogDao.getAllFlow()
            .map { entities -> entities.map { it.toDomain() } }
            .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val recoveryLogs: StateFlow<List<RecoveryLog>> =
        recoveryLogDao.getAllFlow()
            .map { entities -> entities.map { it.toDomain() } }
            .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val progressPhotos: StateFlow<List<ProgressPhoto>> =
        progressPhotoDao.getAllFlow()
            .map { entities -> entities.map { ProgressPhoto(it.date, it.url) } }
            .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    // ── UI state ──────────────────────────────────────────────────────────────

    private val _currentTab = MutableStateFlow(AppTab.HOME)
    val currentTab: StateFlow<AppTab> = _currentTab.asStateFlow()

    private val _toasts = MutableStateFlow<List<AppToast>>(emptyList())
    val toasts: StateFlow<List<AppToast>> = _toasts.asStateFlow()

    private val _achievements = MutableStateFlow<List<Achievement>>(emptyList())
    val achievements: StateFlow<List<Achievement>> = _achievements.asStateFlow()

    private val _mealEatenRecord = MutableStateFlow<Map<String, List<String>>>(emptyMap())
    val mealEatenRecord: StateFlow<Map<String, List<String>>> = _mealEatenRecord.asStateFlow()

    private val _weeklyGoals = MutableStateFlow<List<WeeklyGoal>>(defaultWeeklyGoals())
    val weeklyGoals: StateFlow<List<WeeklyGoal>> = _weeklyGoals.asStateFlow()

    private val _customWorkout = MutableStateFlow<List<Exercise>>(emptyList())
    val customWorkout: StateFlow<List<Exercise>> = _customWorkout.asStateFlow()

    // ── Init — rehydrate from DataStore ──────────────────────────────────────

    init {
        viewModelScope.launch {
            rehydrate()
        }
    }

    private suspend fun rehydrate() {
        prefs.authToken.first()?.let { token ->
            _authToken.value = token
            _isAuthenticated.value = true
        }
        prefs.getUser().first()?.let { _user.value = it }
        prefs.isOnboarded.first().let { _isOnboarded.value = it }
        prefs.theme.first().let { _theme.value = AppTheme.fromKey(it) }
        prefs.getProfile().first()?.let { _profile.value = it }
        prefs.getRoutine().first().let { _routine.value = it }
        prefs.getDiet().first()?.let { _diet.value = it }
        prefs.getInsights().first()?.let { _insights.value = it }
        prefs.motivationPhrase.first().let { _motivationPhrase.value = it }
        prefs.motivationPhoto.first()?.let { _motivationPhoto.value = it }
        prefs.profilePhoto.first()?.let { _profilePhoto.value = it }
        prefs.notificationsEnabled.first().let { _notificationsEnabled.value = it }
        prefs.getAchievements().first().let { _achievements.value = it }
        prefs.getMealEatenRecord().first().let { _mealEatenRecord.value = it }
        _hasHydrated.value = true
    }

    // ── Auth actions ──────────────────────────────────────────────────────────

    fun setAuthToken(token: String?) {
        _authToken.value = token
        _isAuthenticated.value = token != null
        viewModelScope.launch { prefs.saveAuthToken(token) }
    }

    fun setUser(user: User?) {
        _user.value = user
        viewModelScope.launch { prefs.saveUser(user) }
    }

    fun completeOnboarding() {
        _isOnboarded.value = true
        viewModelScope.launch { prefs.setOnboarded(true) }
    }

    fun logout() {
        _authToken.value = null
        _isAuthenticated.value = false
        _isOnboarded.value = false
        _user.value = null
        _profile.value = null
        _routine.value = emptyList()
        _diet.value = null
        _insights.value = null
        _motivationPhrase.value = "Cada serie te acerca más a tu meta. ¡No pares!"
        _motivationPhoto.value = null
        _profilePhoto.value = null
        _achievements.value = emptyList()
        _mealEatenRecord.value = emptyMap()
        _weeklyGoals.value = defaultWeeklyGoals()
        _customWorkout.value = emptyList()
        viewModelScope.launch {
            prefs.clearAll()
            workoutLogDao.deleteAll()
            weightLogDao.deleteAll()
            recoveryLogDao.deleteAll()
            progressPhotoDao.deleteAll()
        }
    }

    // ── Profile actions ───────────────────────────────────────────────────────

    fun setProfile(profile: UserProfile) {
        _profile.value = profile
        viewModelScope.launch { prefs.saveProfile(profile) }
    }

    fun updateProfile(updates: UserProfile) = setProfile(updates)

    fun setRoutine(routine: List<WorkoutDay>) {
        _routine.value = routine
        viewModelScope.launch { prefs.saveRoutine(routine) }
    }

    fun setDiet(diet: DietPlan) {
        _diet.value = diet
        viewModelScope.launch { prefs.saveDiet(diet) }
    }

    fun setInsights(insights: Insights) {
        _insights.value = insights
        viewModelScope.launch { prefs.saveInsights(insights) }
    }

    fun swapMeal(mealId: String, newMeal: Meal) {
        val currentDiet = _diet.value ?: return
        val updated = currentDiet.copy(meals = currentDiet.meals.map { if (it.id == mealId) newMeal else it })
        setDiet(updated)
    }

    fun setTheme(theme: AppTheme) {
        _theme.value = theme
        viewModelScope.launch { prefs.setTheme(theme.key) }
    }

    fun setMotivationPhrase(phrase: String) {
        _motivationPhrase.value = phrase
        viewModelScope.launch { prefs.setMotivationPhrase(phrase) }
    }

    fun setMotivationPhoto(url: String?) {
        _motivationPhoto.value = url
        viewModelScope.launch { prefs.setMotivationPhoto(url) }
    }

    fun setProfilePhoto(url: String?) {
        _profilePhoto.value = url
        viewModelScope.launch { prefs.setProfilePhoto(url) }
    }

    fun setNotificationsEnabled(v: Boolean) {
        _notificationsEnabled.value = v
        viewModelScope.launch { prefs.setNotificationsEnabled(v) }
    }

    // ── Log actions ───────────────────────────────────────────────────────────

    fun addWorkoutLog(log: WorkoutLog) {
        viewModelScope.launch {
            workoutLogDao.insert(log.toEntity())
            // Check achievements
            val currentLogs = workoutLogs.value + log
            val newAchievements = checkNewAchievements(
                currentLogs, _achievements.value.map { it.id }, log.exerciseId, log.weight
            )
            if (newAchievements.isNotEmpty()) {
                val now = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
                val unlocked = newAchievements.map { it.copy(unlockedAt = now) }
                _achievements.value = _achievements.value + unlocked
                viewModelScope.launch { prefs.saveAchievements(_achievements.value) }
                unlocked.forEach { a ->
                    showToast(AppToast(id = a.id, type = ToastType.SUCCESS, title = "${a.icon} ${a.label}", message = a.description))
                }
            }
            // Sync to server
            _authToken.value?.let { token ->
                runCatching {
                    api.syncWorkoutLogs("Bearer $token", SyncLogsRequest(listOf(log.toDto())))
                }
            }
        }
    }

    fun addWeightLog(log: WeightLog) {
        viewModelScope.launch {
            weightLogDao.insert(log.toEntity())
            _authToken.value?.let { token ->
                runCatching {
                    api.syncWeightLogs("Bearer $token", SyncWeightLogsRequest(listOf(WeightLogDto(log.date, log.weight))))
                }
            }
        }
    }

    fun addRecoveryLog(log: RecoveryLog) {
        viewModelScope.launch {
            recoveryLogDao.insert(RecoveryLogEntity(date = log.date, sleepHours = log.sleepHours, hrv = log.hrv, score = log.score))
        }
    }

    fun addProgressPhoto(photo: ProgressPhoto) {
        viewModelScope.launch {
            progressPhotoDao.insert(ProgressPhotoEntity(photo.date, photo.url))
        }
    }

    // ── UI actions ────────────────────────────────────────────────────────────

    fun setTab(tab: AppTab) { _currentTab.value = tab }

    fun showToast(toast: AppToast) {
        _toasts.value = listOf(toast) + _toasts.value.take(2)
    }

    fun dismissToast(id: String) {
        _toasts.value = _toasts.value.filter { it.id != id }
    }

    fun toggleMealEaten(mealId: String, date: String) {
        val current = _mealEatenRecord.value.toMutableMap()
        val eaten = current[date]?.toMutableList() ?: mutableListOf()
        if (eaten.contains(mealId)) eaten.remove(mealId) else eaten.add(mealId)
        current[date] = eaten
        _mealEatenRecord.value = current
        viewModelScope.launch { prefs.saveMealEatenRecord(current) }
    }

    fun toggleWeeklyGoal(id: String) {
        _weeklyGoals.value = _weeklyGoals.value.map {
            if (it.id == id) it.copy(done = !it.done) else it
        }
    }

    fun addAchievement(achievement: Achievement) {
        if (_achievements.value.none { it.id == achievement.id }) {
            _achievements.value = _achievements.value + achievement
            viewModelScope.launch { prefs.saveAchievements(_achievements.value) }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun WorkoutLog.toEntity() = WorkoutLogEntity(
        date = date, exerciseId = exerciseId, weight = weight, reps = reps,
        duration = duration, rpe = rpe, rir = rir
    )

    private fun WorkoutLog.toDto() = WorkoutLogDto(
        date = date, exerciseId = exerciseId, weight = weight, reps = reps,
        duration = duration, rpe = rpe, rir = rir
    )

    private fun WorkoutLogEntity.toDomain() = WorkoutLog(
        date = date, exerciseId = exerciseId, weight = weight, reps = reps,
        duration = duration, rpe = rpe, rir = rir
    )

    private fun WeightLog.toEntity() = WeightLogEntity(date = date, weight = weight)

    private fun WeightLogEntity.toDomain() = WeightLog(date = date, weight = weight)

    private fun RecoveryLogEntity.toDomain() = RecoveryLog(
        date = date, sleepHours = sleepHours, hrv = hrv, score = score
    )

    private fun defaultWeeklyGoals() = listOf(
        WeeklyGoal("sleep", "Dormir 8h cada noche"),
        WeeklyGoal("water", "Beber 2L de agua al día"),
        WeeklyGoal("steps", "10.000 pasos diarios"),
        WeeklyGoal("protein", "Llegar al objetivo proteico"),
        WeeklyGoal("workout", "Completar todos los entrenos")
    )
}
