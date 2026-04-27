package com.voltbody.app.ui.screens.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voltbody.app.data.preferences.AppPreferences
import com.voltbody.app.data.remote.ApiService
import com.voltbody.app.data.remote.dto.LoginRequest
import com.voltbody.app.data.remote.dto.RegisterRequest
import com.voltbody.app.domain.model.AppTheme
import com.voltbody.app.domain.model.User
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthResult(val needsOnboarding: Boolean)

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val authResult: AuthResult? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val api: ApiService,
    private val prefs: AppPreferences,
    private val appViewModel: AppViewModel
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(request: LoginRequest) {
        viewModelScope.launch {
            _uiState.value = LoginUiState(isLoading = true)
            runCatching {
                val response = api.login(request)
                if (!response.isSuccessful) {
                    val errorBody = response.errorBody()?.string() ?: "Error desconocido"
                    throw Exception(errorBody)
                }
                response.body()!!
            }.onSuccess { dto ->
                appViewModel.setAuthToken(dto.token)
                appViewModel.setUser(User(dto.user.id, dto.user.email, dto.user.name))

                // Restore saved plan if available
                dto.profile?.let { appViewModel.setProfile(it) }
                dto.routine?.let { appViewModel.setRoutine(it) }
                dto.diet?.let { appViewModel.setDiet(it) }
                dto.insights?.let { appViewModel.setInsights(it) }
                dto.profilePhoto?.let { appViewModel.setProfilePhoto(it) }
                dto.motivationPhrase?.let { appViewModel.setMotivationPhrase(it) }
                dto.motivationPhoto?.let { appViewModel.setMotivationPhoto(it) }

                val hasProfile = dto.profile != null
                val hasRoutine = !dto.routine.isNullOrEmpty()

                if (hasProfile && hasRoutine) {
                    appViewModel.completeOnboarding()
                    _uiState.value = LoginUiState(authResult = AuthResult(needsOnboarding = false))
                } else {
                    _uiState.value = LoginUiState(authResult = AuthResult(needsOnboarding = true))
                }
            }.onFailure { e ->
                _uiState.value = LoginUiState(error = parseError(e.message))
            }
        }
    }

    fun register(request: RegisterRequest) {
        viewModelScope.launch {
            _uiState.value = LoginUiState(isLoading = true)
            runCatching {
                val response = api.register(request)
                if (!response.isSuccessful) {
                    val errorBody = response.errorBody()?.string() ?: "Error desconocido"
                    throw Exception(errorBody)
                }
                response.body()!!
            }.onSuccess { dto ->
                appViewModel.setAuthToken(dto.token)
                appViewModel.setUser(User(dto.user.id, dto.user.email, dto.user.name))
                _uiState.value = LoginUiState(authResult = AuthResult(needsOnboarding = true))
            }.onFailure { e ->
                _uiState.value = LoginUiState(error = parseError(e.message))
            }
        }
    }

    private fun parseError(msg: String?): String {
        if (msg == null) return "Error de conexión"
        return when {
            msg.contains("401") || msg.contains("Invalid credentials") -> "Correo o contraseña incorrectos"
            msg.contains("409") || msg.contains("already exists") -> "Este correo ya está registrado"
            msg.contains("timeout") || msg.contains("connect") -> "No se puede conectar al servidor"
            else -> "Error: $msg"
        }
    }
}
