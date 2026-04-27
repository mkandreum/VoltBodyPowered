package com.voltbody.app.ui.screens.onboarding

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.voltbody.app.domain.model.*
import com.voltbody.app.ui.components.*
import com.voltbody.app.ui.screens.login.VoltTextField
import com.voltbody.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()
    val pagerState = rememberPagerState(pageCount = { OnboardingStep.entries.size })
    val scope = rememberCoroutineScope()

    LaunchedEffect(uiState.isComplete) {
        if (uiState.isComplete) onComplete()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(vb.bg)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
            userScrollEnabled = false
        ) { page ->
            OnboardingPage(
                step = OnboardingStep.entries[page],
                state = uiState,
                onUpdate = viewModel::update
            )
        }

        // Bottom navigation
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(24.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Progress dots
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OnboardingStep.entries.forEachIndexed { index, _ ->
                    val isActive = pagerState.currentPage == index
                    val width by animateDpAsState(if (isActive) 24.dp else 6.dp, label = "dot")
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .height(6.dp)
                            .width(width)
                            .clip(CircleShape)
                            .background(if (isActive) vb.accent else vb.border)
                    )
                }
            }

            // Buttons row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (pagerState.currentPage > 0) {
                    OutlinedButton(
                        onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } },
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, vb.border)
                    ) {
                        Text("Atrás", color = vb.textMuted)
                    }
                }

                val isLastStep = pagerState.currentPage == OnboardingStep.entries.size - 1
                Button(
                    onClick = {
                        if (isLastStep) {
                            viewModel.generatePlan()
                        } else {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        }
                    },
                    enabled = !uiState.isGenerating,
                    modifier = Modifier.weight(if (pagerState.currentPage > 0) 1f else 1f).height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
                ) {
                    if (uiState.isGenerating) {
                        CircularProgressIndicator(color = ColorBlack, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Generando con IA...", fontWeight = FontWeight.Bold)
                    } else {
                        Text(if (isLastStep) "¡Generar plan IA! ✨" else "Continuar", fontWeight = FontWeight.Black)
                    }
                }
            }

            uiState.error?.let { err ->
                Text(text = err, style = MaterialTheme.typography.bodySmall, color = ColorError, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun OnboardingPage(
    step: OnboardingStep,
    state: OnboardingUiState,
    onUpdate: (OnboardingUiState) -> Unit
) {
    val vb = LocalVoltBodyColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 60.dp, bottom = 160.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Step header
        Text(
            text = step.emoji,
            fontSize = 40.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            text = step.title,
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
            color = ColorWhite,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            text = step.subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = vb.textMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        AccentDivider()

        // Step content
        when (step) {
            OnboardingStep.PERSONAL -> PersonalStep(state, onUpdate)
            OnboardingStep.BODY -> BodyStep(state, onUpdate)
            OnboardingStep.GOAL -> GoalStep(state, onUpdate)
            OnboardingStep.SCHEDULE -> ScheduleStep(state, onUpdate)
            OnboardingStep.DIET -> DietPrefsStep(state, onUpdate)
            OnboardingStep.AVATAR -> AvatarStep(state, onUpdate)
        }
    }
}

// ── Step forms ─────────────────────────────────────────────────────────────────

@Composable
private fun PersonalStep(state: OnboardingUiState, onUpdate: (OnboardingUiState) -> Unit) {
    VoltTextField(value = state.name, onValueChange = { onUpdate(state.copy(name = it)) }, label = "Nombre completo")
    NumberInputRow(
        label = "Edad",
        value = state.age,
        range = 14..80,
        unit = "años",
        onValueChange = { onUpdate(state.copy(age = it)) }
    )
    GenderSelector(selected = state.gender, onSelect = { onUpdate(state.copy(gender = it)) })
}

@Composable
private fun BodyStep(state: OnboardingUiState, onUpdate: (OnboardingUiState) -> Unit) {
    NumberInputRow("Peso actual", state.weight.toInt(), 30..200, "kg") { onUpdate(state.copy(weight = it.toFloat())) }
    NumberInputRow("Altura", state.height.toInt(), 130..220, "cm") { onUpdate(state.copy(height = it.toFloat())) }
    ChipSelector(
        label = "Estado actual",
        options = listOf("Principiante", "Intermedio", "Avanzado"),
        selected = state.currentState,
        onSelect = { onUpdate(state.copy(currentState = it)) }
    )
}

@Composable
private fun GoalStep(state: OnboardingUiState, onUpdate: (OnboardingUiState) -> Unit) {
    ChipSelector(
        label = "Objetivo principal",
        options = listOf("Ganar músculo", "Perder grasa", "Mantenimiento", "Rendimiento", "Salud general"),
        selected = state.goal,
        onSelect = { onUpdate(state.copy(goal = it)) }
    )
    ChipSelector(
        label = "Dirección de peso",
        options = listOf("Ganar", "Perder", "Mantener"),
        selected = state.goalDirection,
        onSelect = { onUpdate(state.copy(goalDirection = it)) }
    )
    NumberInputRow("Meta de kg", state.goalTargetKg.toInt(), 1..50, "kg") { onUpdate(state.copy(goalTargetKg = it.toFloat())) }
    NumberInputRow("Plazo en meses", state.goalTimelineMonths, 1..24, "meses") { onUpdate(state.copy(goalTimelineMonths = it)) }
}

@Composable
private fun ScheduleStep(state: OnboardingUiState, onUpdate: (OnboardingUiState) -> Unit) {
    NumberInputRow("Días de entreno por semana", state.trainingDaysPerWeek, 2..6, "días") { onUpdate(state.copy(trainingDaysPerWeek = it)) }
    NumberInputRow("Duración de sesión", state.sessionMinutes, 30..120, "min") { onUpdate(state.copy(sessionMinutes = it)) }
    ChipSelector(
        label = "Horario laboral",
        options = listOf("Mañana (6-14h)", "Tarde (14-22h)", "Nocturno (22-6h)", "Variable / Freelance"),
        selected = state.workHours,
        onSelect = { onUpdate(state.copy(workHours = it)) }
    )
    ChipSelector(
        label = "Horario de entreno preferido",
        options = listOf("Mañana", "Mediodía", "Tarde", "Noche"),
        selected = state.schedule,
        onSelect = { onUpdate(state.copy(schedule = it)) }
    )
}

@Composable
private fun DietPrefsStep(state: OnboardingUiState, onUpdate: (OnboardingUiState) -> Unit) {
    val vb = LocalVoltBodyColors.current
    Text("Preferencias alimentarias", style = MaterialTheme.typography.titleMedium, color = ColorWhite)
    Text("(Se usarán para personalizar tu plan nutricional)", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
    Spacer(modifier = Modifier.height(4.dp))
    MultiChipSelector(
        label = "Proteínas favoritas",
        options = listOf("Pollo", "Ternera", "Pescado", "Huevos", "Legumbres", "Tofu", "Proteína en polvo"),
        selected = state.preferredProteins,
        onToggle = { option ->
            val updated = if (state.preferredProteins.contains(option))
                state.preferredProteins - option
            else state.preferredProteins + option
            onUpdate(state.copy(preferredProteins = updated))
        }
    )
    MultiChipSelector(
        label = "Carbohidratos favoritos",
        options = listOf("Arroz", "Pasta", "Patata", "Avena", "Pan integral", "Quinoa"),
        selected = state.preferredCarbs,
        onToggle = { option ->
            val updated = if (state.preferredCarbs.contains(option))
                state.preferredCarbs - option
            else state.preferredCarbs + option
            onUpdate(state.copy(preferredCarbs = updated))
        }
    )
}

@Composable
private fun AvatarStep(state: OnboardingUiState, onUpdate: (OnboardingUiState) -> Unit) {
    val vb = LocalVoltBodyColors.current
    val tempConfig = AvatarConfig(state.avatarMuscleMass, state.avatarBodyFat)
    Avatar3D(config = tempConfig, gender = state.gender)
    Spacer(modifier = Modifier.height(16.dp))
    Text("Masa muscular", style = MaterialTheme.typography.labelLarge, color = vb.textMuted)
    Slider(
        value = state.avatarMuscleMass,
        onValueChange = { onUpdate(state.copy(avatarMuscleMass = it)) },
        valueRange = 0f..1f,
        colors = SliderDefaults.colors(thumbColor = vb.accent, activeTrackColor = vb.accent, inactiveTrackColor = vb.border)
    )
    Text("Grasa corporal", style = MaterialTheme.typography.labelLarge, color = vb.textMuted)
    Slider(
        value = state.avatarBodyFat,
        onValueChange = { onUpdate(state.copy(avatarBodyFat = it)) },
        valueRange = 0f..1f,
        colors = SliderDefaults.colors(thumbColor = vb.accent, activeTrackColor = vb.accent, inactiveTrackColor = vb.border)
    )
}

// ── Reusable input widgets ─────────────────────────────────────────────────────

@Composable
private fun NumberInputRow(
    label: String,
    value: Int,
    range: IntRange,
    unit: String,
    onValueChange: (Int) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = vb.textMuted)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            IconButton(
                onClick = { if (value > range.first) onValueChange(value - 1) },
                modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)
            ) { Text("−", color = vb.accent, fontWeight = FontWeight.Black) }
            Text("$value $unit", color = ColorWhite, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            IconButton(
                onClick = { if (value < range.last) onValueChange(value + 1) },
                modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)
            ) { Text("+", color = vb.accent, fontWeight = FontWeight.Black) }
        }
    }
}

@Composable
private fun GenderSelector(selected: String, onSelect: (String) -> Unit) {
    val vb = LocalVoltBodyColors.current
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf("Masculino" to "♂", "Femenino" to "♀").forEach { (gender, sym) ->
            val isActive = selected == gender
            Button(
                onClick = { onSelect(gender) },
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isActive) vb.accent.copy(alpha = 0.2f) else vb.surface,
                    contentColor = if (isActive) vb.accent else vb.textMuted
                ),
                border = if (isActive) BorderStroke(1.dp, vb.accent.copy(alpha = 0.5f)) else null
            ) { Text("$sym $gender", fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal) }
        }
    }
}

@Composable
private fun ChipSelector(label: String, options: List<String>, selected: String, onSelect: (String) -> Unit) {
    val vb = LocalVoltBodyColors.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = vb.textMuted)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option ->
                val isActive = selected == option
                FilterChip(
                    selected = isActive,
                    onClick = { onSelect(option) },
                    label = { Text(option, style = MaterialTheme.typography.labelMedium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = vb.accent.copy(alpha = 0.2f),
                        selectedLabelColor = vb.accent,
                        containerColor = vb.surface,
                        labelColor = vb.textMuted
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isActive,
                        selectedBorderColor = vb.accent.copy(alpha = 0.5f),
                        borderColor = vb.border
                    )
                )
            }
        }
    }
}

@Composable
private fun MultiChipSelector(label: String, options: List<String>, selected: Set<String>, onToggle: (String) -> Unit) {
    val vb = LocalVoltBodyColors.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = vb.textMuted)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option ->
                val isActive = selected.contains(option)
                FilterChip(
                    selected = isActive,
                    onClick = { onToggle(option) },
                    label = { Text(option, style = MaterialTheme.typography.labelMedium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = vb.accent.copy(alpha = 0.2f),
                        selectedLabelColor = vb.accent,
                        containerColor = vb.surface,
                        labelColor = vb.textMuted
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isActive,
                        selectedBorderColor = vb.accent.copy(alpha = 0.5f),
                        borderColor = vb.border
                    )
                )
            }
        }
    }
}
