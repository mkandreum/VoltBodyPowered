package com.voltbody.app.ui.screens.diet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.data.remote.ApiService
import com.voltbody.app.data.remote.dto.GenerateAlternativeMealRequest
import com.voltbody.app.domain.model.*
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class DietUiState(
    val diet: DietPlan? = null,
    val eatenMealIds: Set<String> = emptySet(),
    val eatenCalories: Int = 0,
    val swappingMealId: String? = null,
    val waterGlasses: Int = 0
)

@HiltViewModel
class DietViewModel @Inject constructor(
    private val api: ApiService,
    private val appViewModel: AppViewModel
) : ViewModel() {

    private val _waterGlasses = MutableStateFlow(0)
    private val _uiState = MutableStateFlow(DietUiState())
    val uiState: StateFlow<DietUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                appViewModel.diet,
                appViewModel.mealEatenRecord,
                _waterGlasses
            ) { diet, mealEatenRecord, water ->
                val today = LocalDate.now().toString()
                val eatenIds = mealEatenRecord[today]?.toSet() ?: emptySet()
                val eatenCalories = diet?.meals
                    ?.filter { eatenIds.contains(it.id) }
                    ?.sumOf { it.calories } ?: 0
                DietUiState(
                    diet = diet,
                    eatenMealIds = eatenIds,
                    eatenCalories = eatenCalories,
                    swappingMealId = _uiState.value.swappingMealId,
                    waterGlasses = water
                )
            }.collect { _uiState.value = it }
        }
    }

    fun toggleMealEaten(mealId: String, date: String) {
        appViewModel.toggleMealEaten(mealId, date)
    }

    fun swapMeal(meal: Meal) {
        val profile = appViewModel.profile.value ?: return
        val token = appViewModel.authToken.value ?: return
        _uiState.value = _uiState.value.copy(swappingMealId = meal.id)

        viewModelScope.launch {
            runCatching {
                api.generateAlternativeMeal(
                    "Bearer $token",
                    GenerateAlternativeMealRequest(meal, profile)
                ).body()!!
            }.onSuccess { newMeal ->
                appViewModel.swapMeal(meal.id, newMeal)
                _uiState.value = _uiState.value.copy(swappingMealId = null)
                appViewModel.showToast(AppToast(
                    id = "meal_swapped",
                    type = ToastType.SUCCESS,
                    title = "Comida cambiada",
                    message = "${meal.name} → ${newMeal.name}"
                ))
            }.onFailure {
                _uiState.value = _uiState.value.copy(swappingMealId = null)
                appViewModel.showToast(AppToast(id = "meal_swap_error", type = ToastType.ERROR, title = "Error al generar alternativa"))
            }
        }
    }

    fun addWaterGlass() {
        if (_waterGlasses.value < 16) _waterGlasses.value++
    }

    fun removeWaterGlass() {
        if (_waterGlasses.value > 0) _waterGlasses.value--
    }
}
