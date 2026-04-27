package com.voltbody.app.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.data.remote.ApiService
import com.voltbody.app.data.remote.dto.GeneratePlanRequest
import com.voltbody.app.domain.model.*
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class OnboardingStep(val emoji: String, val title: String, val subtitle: String) {
    PERSONAL("👤", "Cuéntanos sobre ti", "Tu perfil personal para un plan 100% adaptado"),
    BODY("⚖️", "Métricas corporales", "Peso, altura y nivel de entrenamiento actual"),
    GOAL("🎯", "Tu objetivo", "¿Qué quieres lograr y en cuánto tiempo?"),
    SCHEDULE("📅", "Tu horario", "¿Cuántos días y cuánto tiempo tienes para entrenar?"),
    DIET("🥗", "Preferencias de dieta", "Alimentos que te gustan para tu plan nutricional"),
    AVATAR("🦾", "Tu avatar físico", "Configura cómo se verá tu estado físico en la app")
}

data class OnboardingUiState(
    // Personal
    val name: String = "",
    val age: Int = 25,
    val gender: String = "Masculino",
    // Body
    val weight: Float = 70f,
    val height: Float = 170f,
    val currentState: String = "Principiante",
    // Goal
    val goal: String = "Ganar músculo",
    val goalDirection: String = "Ganar",
    val goalTargetKg: Float = 5f,
    val goalTimelineMonths: Int = 3,
    // Schedule
    val trainingDaysPerWeek: Int = 3,
    val sessionMinutes: Int = 60,
    val workHours: String = "Tarde (14-22h)",
    val schedule: String = "Tarde",
    // Diet
    val preferredProteins: Set<String> = setOf("Pollo", "Huevos"),
    val preferredCarbs: Set<String> = setOf("Arroz", "Avena"),
    // Avatar
    val avatarMuscleMass: Float = 0.5f,
    val avatarBodyFat: Float = 0.5f,
    // Status
    val isGenerating: Boolean = false,
    val error: String? = null,
    val isComplete: Boolean = false
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val api: ApiService,
    private val appViewModel: AppViewModel
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    fun update(state: OnboardingUiState) { _uiState.value = state }

    fun generatePlan() {
        val s = _uiState.value
        _uiState.value = s.copy(isGenerating = true, error = null)

        val profile = UserProfile(
            name = s.name,
            age = s.age,
            weight = s.weight,
            height = s.height,
            gender = s.gender,
            goal = s.goal,
            currentState = s.currentState,
            schedule = s.schedule,
            workHours = s.workHours,
            trainingDaysPerWeek = s.trainingDaysPerWeek,
            sessionMinutes = s.sessionMinutes,
            goalDirection = s.goalDirection,
            goalTargetKg = s.goalTargetKg,
            goalTimelineMonths = s.goalTimelineMonths,
            foodPreferences = FoodPreferences(
                proteins = s.preferredProteins.toList(),
                carbs = s.preferredCarbs.toList()
            ),
            avatarConfig = AvatarConfig(s.avatarMuscleMass, s.avatarBodyFat)
        )

        viewModelScope.launch {
            val token = appViewModel.authToken.value
            runCatching {
                val response = api.generatePlan(
                    "Bearer $token",
                    GeneratePlanRequest(profile)
                )
                if (!response.isSuccessful) throw Exception("Error ${response.code()}: ${response.errorBody()?.string()}")
                response.body()!!
            }.onSuccess { planResponse ->
                appViewModel.setProfile(profile)
                appViewModel.setRoutine(planResponse.routine)
                appViewModel.setDiet(planResponse.diet)
                appViewModel.setInsights(planResponse.insights)
                appViewModel.completeOnboarding()
                _uiState.value = _uiState.value.copy(isGenerating = false, isComplete = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isGenerating = false,
                    error = "No se pudo generar el plan: ${e.message}"
                )
            }
        }
    }
}
