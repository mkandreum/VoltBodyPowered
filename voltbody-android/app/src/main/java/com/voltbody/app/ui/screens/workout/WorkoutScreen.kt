package com.voltbody.app.ui.screens.workout

import android.content.Intent
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.voltbody.app.R
import com.voltbody.app.domain.model.*
import com.voltbody.app.domain.usecase.WEEKDAY_LABELS
import com.voltbody.app.ui.components.*
import com.voltbody.app.ui.theme.*

@Composable
fun WorkoutScreen(
    viewModel: WorkoutViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize().background(vb.bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 60.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Day selector ─────────────────────────────────────────────────
            item {
                Text(
                    "Rutina Semanal",
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                    color = ColorWhite
                )
                Spacer(modifier = Modifier.height(12.dp))
                WeekDaySelector(
                    selectedDay = uiState.selectedDayIndex,
                    completedDays = uiState.completedDays,
                    onDaySelected = viewModel::selectDay
                )
            }

            // ── Today's workout header ────────────────────────────────────────
            uiState.currentWorkoutDay?.let { day ->
                item {
                    AppCard {
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text(day.day, style = MaterialTheme.typography.titleSmall, color = vb.textMuted)
                                Text(day.focus, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black), color = vb.accent)
                            }
                            CircularProgressRing(
                                value = uiState.dayProgress / 100f,
                                modifier = Modifier.size(52.dp),
                                label = "${uiState.dayProgress}%"
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        // Session timer
                        if (uiState.sessionRunning) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Outlined.Timer, contentDescription = null, tint = vb.accent, modifier = Modifier.size(16.dp))
                                Text(formatDuration(uiState.sessionElapsed), style = MonoMetric.copy(fontSize = 16.sp), color = vb.accent)
                            }
                        } else {
                            Button(
                                onClick = viewModel::startSession,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
                            ) {
                                Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Iniciar sesión", fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }

                // ── Rest timer ────────────────────────────────────────────────
                if (uiState.restSecondsLeft > 0) {
                    item {
                        RestTimerCard(secondsLeft = uiState.restSecondsLeft, total = 90, onSkip = viewModel::skipRest)
                    }
                }

                // ── Exercise list ─────────────────────────────────────────────
                items(day.exercises, key = { it.id }) { exercise ->
                    ExerciseCard(
                        exercise = exercise,
                        completedSets = uiState.completedSets[exercise.id] ?: 0,
                        progressiveSuggestion = uiState.progressiveSuggestions[exercise.id],
                        onLogSet = { viewModel.openLogSheet(exercise) }
                    )
                }
            } ?: item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("😴", fontSize = 40.sp)
                        Text("Día de descanso", style = MaterialTheme.typography.headlineSmall, color = vb.textMuted)
                        Text("Aprovecha para recuperar y crecer 💪", style = MaterialTheme.typography.bodyMedium, color = vb.textMuted, textAlign = TextAlign.Center)
                    }
                }
            }

            // Workout complete celebration + share card
            if (uiState.workoutComplete) {
                item {
                    uiState.currentWorkoutDay?.let { day ->
                        WorkoutSummaryShareCard(
                            day = day,
                            setsLogged = uiState.todaySetsLogged,
                            duration = uiState.sessionElapsed,
                            streak = uiState.currentStreak,
                            userName = uiState.userName
                        )
                    }
                }
            }
        }

        // ── Bottom: log set sheet (as dialog) ─────────────────────────────────
        uiState.logSheetExercise?.let { exercise ->
            LogSetDialog(
                exercise = exercise,
                lastWeight = uiState.lastWeightForExercise[exercise.id],
                onDismiss = viewModel::closeLogSheet,
                onLog = { weight, reps, rir, sets, duration, rpe ->
                    viewModel.logSet(exercise, weight, reps, rir, sets, duration, rpe)
                }
            )
        }
    }
}

// ── Components ────────────────────────────────────────────────────────────────

@Composable
private fun WeekDaySelector(
    selectedDay: Int,
    completedDays: Set<Int>,
    onDaySelected: (Int) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        WEEKDAY_LABELS.forEachIndexed { index, (_, short, _) ->
            val isSelected = selectedDay == index
            val isCompleted = completedDays.contains(index)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        when {
                            isSelected -> vb.accent.copy(alpha = 0.2f)
                            isCompleted -> ColorSuccess.copy(alpha = 0.12f)
                            else -> vb.surface
                        }
                    )
                    .border(
                        1.dp,
                        when {
                            isSelected -> vb.accent.copy(alpha = 0.6f)
                            isCompleted -> ColorSuccess.copy(alpha = 0.4f)
                            else -> vb.border
                        },
                        RoundedCornerShape(10.dp)
                    )
                    .clickable { onDaySelected(index) }
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    short,
                    style = UppercaseLabel.copy(fontSize = 9.sp),
                    color = if (isSelected) vb.accent else if (isCompleted) ColorSuccess else vb.textMuted
                )
                if (isCompleted) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = ColorSuccess, modifier = Modifier.size(12.dp).padding(top = 2.dp))
                }
            }
        }
    }
}

@Composable
private fun ExerciseCard(
    exercise: Exercise,
    completedSets: Int,
    progressiveSuggestion: com.voltbody.app.domain.usecase.ProgressiveSuggestion?,
    onLogSet: () -> Unit
) {
    val vb = LocalVoltBodyColors.current
    val isComplete = completedSets >= exercise.sets
    val progress = if (exercise.sets > 0) completedSets.toFloat() / exercise.sets else 0f
    val animProgress by animateFloatAsState(progress.coerceIn(0f, 1f), tween(400), label = "ex_progress")

    AppCard(onClick = onLogSet) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (isComplete) {
                        Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = ColorSuccess, modifier = Modifier.size(16.dp))
                    }
                    Text(
                        exercise.name,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = if (isComplete) ColorSuccess else ColorWhite
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    "${exercise.sets} series × ${exercise.reps}" + if (exercise.weight > 0) " · ${exercise.weight}kg" else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = vb.textMuted
                )
                progressiveSuggestion?.let {
                    Text(
                        "⬆ Sugerido: ${it.suggestedWeight}kg (+${it.increment}kg)",
                        style = MaterialTheme.typography.bodySmall,
                        color = vb.accent
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                // Sets progress
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    repeat(exercise.sets) { i ->
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(if (i < completedSets) vb.accent else vb.border)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            // Log button
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (isComplete) ColorSuccess.copy(0.15f) else vb.accent.copy(0.15f))
                    .border(1.dp, if (isComplete) ColorSuccess.copy(0.4f) else vb.accent.copy(0.4f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isComplete) Icons.Filled.Check else Icons.Filled.Add,
                    contentDescription = "Log set",
                    tint = if (isComplete) ColorSuccess else vb.accent,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
        NeonBadge(exercise.muscleGroup, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun RestTimerCard(secondsLeft: Int, total: Int, onSkip: () -> Unit) {
    val vb = LocalVoltBodyColors.current
    val progress = secondsLeft.toFloat() / total

    AppCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CircularProgressRing(
                    value = progress,
                    modifier = Modifier.size(56.dp),
                    fillColor = vb.accent,
                    label = "$secondsLeft"
                )
                Column {
                    Text("Descanso", style = MaterialTheme.typography.titleSmall, color = ColorWhite)
                    Text("${secondsLeft}s restantes", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                }
            }
            OutlinedButton(
                onClick = onSkip,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, vb.border)
            ) { Text("Saltar", color = vb.textMuted, style = MaterialTheme.typography.labelMedium) }
        }
    }
}

@Composable
private fun LogSetDialog(
    exercise: Exercise,
    lastWeight: Float?,
    onDismiss: () -> Unit,
    onLog: (weight: Float, reps: Int, rir: Int?, sets: Int, duration: Int?, rpe: Int?) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    val exerciseType = exercise.exerciseType?.let { t ->
        when (t.lowercase()) {
            "isometric" -> ExerciseType.ISOMETRIC
            "bodyweight" -> ExerciseType.BODYWEIGHT
            "cardio" -> ExerciseType.CARDIO
            else -> ExerciseType.WEIGHTED
        }
    } ?: ExerciseType.WEIGHTED

    var weight by remember { mutableStateOf(lastWeight ?: exercise.weight) }
    var reps by remember { mutableStateOf(exercise.reps.split("-").firstOrNull()?.trim()?.toIntOrNull() ?: 10) }
    var rir by remember { mutableStateOf<Int?>(null) }
    var sets by remember { mutableStateOf(1) }
    var duration by remember { mutableStateOf(exercise.durationTarget ?: 30) }
    var rpe by remember { mutableStateOf<Int?>(null) }

    // Isometric running timer
    var isometricRunning by remember { mutableStateOf(false) }
    var isometricElapsed by remember { mutableStateOf(0) }
    LaunchedEffect(isometricRunning) {
        if (isometricRunning) {
            while (isometricRunning) {
                kotlinx.coroutines.delay(1000)
                isometricElapsed++
                if (isometricElapsed >= duration) { isometricRunning = false }
            }
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.7f))
                .clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }) { onDismiss() },
            contentAlignment = Alignment.BottomCenter
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(vb.surfaceElevated)
                    .border(1.dp, vb.border, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .padding(20.dp)
                    .imePadding()
                    .clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }) {}
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text(exercise.name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = ColorWhite)
                        NeonBadge(exercise.muscleGroup, modifier = Modifier.padding(top = 4.dp))
                    }
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = null, tint = vb.textMuted) }
                }

                AccentDivider()

                when (exerciseType) {
                    ExerciseType.WEIGHTED, ExerciseType.BODYWEIGHT -> {
                        // Weight (hide for bodyweight)
                        if (exerciseType == ExerciseType.WEIGHTED) {
                            LabeledNumberStepper(
                                label = "Peso (kg)",
                                value = weight.toInt(),
                                step = 2,
                                onValueChange = { weight = it.toFloat() }
                            )
                            // Weight Calculator
                            WeightCalculatorSection(
                                exerciseName = exercise.name,
                                targetWeight = exercise.weight,
                                userBodyweight = 0f,
                                onWeightApplied = { weight = it }
                            )
                        }
                        LabeledNumberStepper(label = "Repeticiones", value = reps, step = 1, onValueChange = { reps = it })
                        LabeledNumberStepper(label = "Series a registrar", value = sets, min = 1, max = 6, step = 1, onValueChange = { sets = it })
                        // RIR selector
                        Column {
                            Text("RIR (Reps en reserva)", style = MaterialTheme.typography.labelLarge, color = vb.textMuted)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf(null, 0, 1, 2, 3, 4).forEach { v ->
                                    FilterChip(
                                        selected = rir == v,
                                        onClick = { rir = v },
                                        label = { Text(v?.toString() ?: "–", style = MaterialTheme.typography.labelSmall) },
                                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = vb.accent.copy(0.2f), selectedLabelColor = vb.accent, containerColor = vb.surface, labelColor = vb.textMuted)
                                    )
                                }
                            }
                        }
                    }
                    ExerciseType.ISOMETRIC -> {
                        // Timer display
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressRing(
                                value = if (duration > 0) isometricElapsed.toFloat() / duration else 0f,
                                modifier = Modifier.size(120.dp),
                                strokeWidth = 8.dp,
                                label = if (isometricRunning) "${duration - isometricElapsed}s" else "${duration}s"
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            OutlinedButton(onClick = {
                                isometricElapsed = 0
                                isometricRunning = true
                            }, shape = RoundedCornerShape(12.dp)) { Text("▶ Iniciar", color = vb.accent) }
                            OutlinedButton(onClick = { isometricRunning = false }, shape = RoundedCornerShape(12.dp)) { Text("⏸ Pausa", color = vb.textMuted) }
                            OutlinedButton(onClick = { isometricElapsed = 0; isometricRunning = false }, shape = RoundedCornerShape(12.dp)) { Text("↺ Reset", color = vb.textMuted) }
                        }
                        LabeledNumberStepper(label = "Objetivo (seg)", value = duration, step = 5, onValueChange = { duration = it })
                        // RPE
                        Column {
                            Text("RPE (Esfuerzo percibido 1-10)", style = MaterialTheme.typography.labelLarge, color = vb.textMuted)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                                (1..10).forEach { v ->
                                    FilterChip(
                                        selected = rpe == v,
                                        onClick = { rpe = v },
                                        label = { Text("$v", style = MaterialTheme.typography.labelSmall) },
                                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = vb.accent.copy(0.2f), selectedLabelColor = vb.accent, containerColor = vb.surface, labelColor = vb.textMuted)
                                    )
                                }
                            }
                        }
                    }
                    ExerciseType.CARDIO -> {
                        LabeledNumberStepper(label = "Duración (seg)", value = duration, step = 30, onValueChange = { duration = it })
                        Text(formatDuration(duration), style = MonoMetric.copy(fontSize = 28.sp), color = vb.accent, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    }
                }

                // Log button
                Button(
                    onClick = {
                        val d = if (exerciseType == ExerciseType.ISOMETRIC || exerciseType == ExerciseType.CARDIO) isometricElapsed.takeIf { it > 0 } ?: duration else null
                        onLog(weight, reps, rir, sets, d, rpe)
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Registrar ${if (sets > 1) "$sets series" else "serie"}", fontWeight = FontWeight.Black, fontSize = 15.sp)
                }

                Spacer(modifier = Modifier.navigationBarsPadding())
            }
        }
    }
}

@Composable
private fun LabeledNumberStepper(
    label: String,
    value: Int,
    step: Int = 1,
    min: Int = 0,
    max: Int = 999,
    onValueChange: (Int) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = vb.textMuted)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            IconButton(
                onClick = { if (value - step >= min) onValueChange(value - step) },
                modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)
            ) { Text("−", color = vb.accent, fontWeight = FontWeight.Black, fontSize = 16.sp) }
            Text("$value", style = MonoMetric.copy(fontSize = 20.sp), color = ColorWhite, fontWeight = FontWeight.Bold)
            IconButton(
                onClick = { if (value + step <= max) onValueChange(value + step) },
                modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)
            ) { Text("+", color = vb.accent, fontWeight = FontWeight.Black, fontSize = 16.sp) }
        }
    }
}

// ── Weight Calculator (ported from WeightCalculator.tsx) ──────────────────────

private enum class EquipmentCategory { BARBELL, DUMBBELL, MACHINE, BODYWEIGHT }

private val BARBELL_KEYWORDS = listOf(
    "banca", "press de banca", "sentadilla", "peso muerto", "press militar",
    "remo con barra", "jalón", "dominada", "press banca", "rumano",
    "press francés", "barra", "hip thrust", "curl con barra"
)
private val DUMBBELL_KEYWORDS = listOf(
    "mancuerna", "curl de bíceps", "curl martillo", "press inclinado con mancuernas",
    "aperturas", "elevaciones laterales", "pájaros", "press con mancuernas",
    "curl de biceps", "press de hombros"
)
private val BODYWEIGHT_KEYWORDS = listOf(
    "dominadas asistidas", "fondos en paralelas", "fondos", "flexiones",
    "plancha", "burpees", "sentadilla búlgara", "step"
)
private val MACHINE_KEYWORDS = listOf(
    "polea", "prensa", "cable", "extensión", "face pull", "máquina",
    "jalón al pecho", "remo en cable", "extensión de tríceps"
)

private fun detectEquipmentCategory(name: String): EquipmentCategory {
    val lower = name.lowercase()
    if (BODYWEIGHT_KEYWORDS.any { lower.contains(it) }) return EquipmentCategory.BODYWEIGHT
    if (DUMBBELL_KEYWORDS.any { lower.contains(it) }) return EquipmentCategory.DUMBBELL
    if (BARBELL_KEYWORDS.any { lower.contains(it) }) return EquipmentCategory.BARBELL
    if (MACHINE_KEYWORDS.any { lower.contains(it) }) return EquipmentCategory.MACHINE
    return EquipmentCategory.MACHINE
}

private val PLATE_OPTIONS = listOf(1.25f, 2.5f, 5f, 10f, 15f, 20f, 25f)
private val BARBELL_OPTIONS = listOf(
    Pair("Barra Olímpica (20 kg)", 20f),
    Pair("Barra Mujer (15 kg)", 15f),
    Pair("Barra Pesada (25 kg)", 25f)
)

private fun roundToNearestPlate(kg: Float): Float =
    PLATE_OPTIONS.minByOrNull { kotlin.math.abs(it - kg) } ?: PLATE_OPTIONS.first()

/**
 * Collapsible weight calculator — ported from WeightCalculator.tsx.
 * Integrated inside LogSetDialog for WEIGHTED exercises.
 *
 * @param exerciseName  name of the exercise (used for category detection)
 * @param targetWeight  AI-suggested target weight (0 = not set)
 * @param userBodyweight body weight from profile (bodyweight exercises)
 * @param onWeightApplied called when user taps "Usar" with the computed total
 */
@Composable
private fun WeightCalculatorSection(
    exerciseName: String,
    targetWeight: Float,
    userBodyweight: Float,
    onWeightApplied: (Float) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    val category = remember(exerciseName) { detectEquipmentCategory(exerciseName) }

    var expanded by remember { mutableStateOf(false) }
    var barbellKg by remember { mutableFloatStateOf(20f) }
    var platesPerSide by remember { mutableFloatStateOf(0f) }
    var dumbbellKg by remember { mutableFloatStateOf(0f) }
    var machineKg by remember { mutableFloatStateOf(if (targetWeight > 0f) targetWeight else 0f) }

    val total: Float = when (category) {
        EquipmentCategory.BARBELL -> barbellKg + platesPerSide * 2f
        EquipmentCategory.DUMBBELL -> dumbbellKg * 2f
        EquipmentCategory.MACHINE -> machineKg
        EquipmentCategory.BODYWEIGHT -> userBodyweight
    }

    val categoryLabel = when (category) {
        EquipmentCategory.BARBELL -> "🏋️ Con barra"
        EquipmentCategory.DUMBBELL -> "💪 Mancuernas"
        EquipmentCategory.MACHINE -> "⚙️ Máquina / Cable"
        EquipmentCategory.BODYWEIGHT -> "🤸 Peso corporal"
    }

    Column {
        // ── Toggle row ──────────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(10.dp))
                .clickable { expanded = !expanded }
                .padding(horizontal = 4.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(Icons.Filled.Build, contentDescription = null, tint = vb.textMuted, modifier = Modifier.size(14.dp))
            Text("Calcular peso", style = UppercaseLabel.copy(fontSize = 11.sp), color = vb.textMuted)
            Icon(
                if (expanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                contentDescription = null, tint = vb.textMuted, modifier = Modifier.size(14.dp)
            )
            Text(categoryLabel, style = MaterialTheme.typography.labelSmall, color = vb.textMuted.copy(0.7f))
        }

        AnimatedVisibility(visible = expanded) {
            Column(
                modifier = Modifier
                    .padding(top = 8.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(vb.surface)
                    .border(1.dp, vb.border, RoundedCornerShape(14.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Goal badge
                if (targetWeight > 0f) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Meta IA:", style = MaterialTheme.typography.labelSmall, color = vb.textMuted)
                        Text("${targetWeight} kg", style = MonoMetric.copy(fontSize = 13.sp), color = vb.accent)
                    }
                }

                when (category) {
                    EquipmentCategory.BARBELL -> {
                        // Barbell selector
                        Text("Tipo de barra", style = UppercaseLabel.copy(fontSize = 10.sp), color = vb.textMuted)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            BARBELL_OPTIONS.forEach { (label, kg) ->
                                val selected = barbellKg == kg
                                FilterChip(
                                    selected = selected,
                                    onClick = { barbellKg = kg },
                                    label = { Text("${kg.toInt()} kg", style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = vb.accent.copy(0.2f),
                                        selectedLabelColor = vb.accent,
                                        containerColor = vb.surfaceElevated,
                                        labelColor = vb.textMuted
                                    )
                                )
                            }
                        }
                        // Plates per side
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Discos por lado (kg)", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                IconButton(
                                    onClick = { platesPerSide = maxOf(0f, platesPerSide - 2.5f) },
                                    modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.surfaceElevated)
                                ) { Text("−", color = vb.accent, fontWeight = FontWeight.Black) }
                                Text(
                                    if (platesPerSide == platesPerSide.toLong().toFloat()) "${platesPerSide.toInt()}" else "$platesPerSide",
                                    style = MonoMetric.copy(fontSize = 18.sp), color = ColorWhite
                                )
                                IconButton(
                                    onClick = { platesPerSide += 2.5f },
                                    modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.surfaceElevated)
                                ) { Text("+", color = vb.accent, fontWeight = FontWeight.Black) }
                            }
                        }
                        // Suggest plates CTA
                        if (targetWeight > 0f) {
                            OutlinedButton(
                                onClick = {
                                    val needed = (targetWeight - barbellKg) / 2f
                                    platesPerSide = if (needed <= 0f) 0f else roundToNearestPlate(needed)
                                },
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, vb.accent.copy(0.4f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Filled.Lightbulb, contentDescription = null, tint = vb.accent, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Sugerir discos", color = vb.accent, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }

                    EquipmentCategory.DUMBBELL -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Peso por mancuerna (kg)", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                IconButton(
                                    onClick = { dumbbellKg = maxOf(0f, dumbbellKg - 1f) },
                                    modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.surfaceElevated)
                                ) { Text("−", color = vb.accent, fontWeight = FontWeight.Black) }
                                Text("${dumbbellKg.toInt()}", style = MonoMetric.copy(fontSize = 18.sp), color = ColorWhite)
                                IconButton(
                                    onClick = { dumbbellKg += 1f },
                                    modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.surfaceElevated)
                                ) { Text("+", color = vb.accent, fontWeight = FontWeight.Black) }
                            }
                        }
                        if (dumbbellKg > 0f) Text("${dumbbellKg.toInt()} kg c/brazo", style = MaterialTheme.typography.labelSmall, color = vb.textMuted)
                    }

                    EquipmentCategory.MACHINE -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Peso en máquina (kg)", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                IconButton(
                                    onClick = { machineKg = maxOf(0f, machineKg - 5f) },
                                    modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.surfaceElevated)
                                ) { Text("−", color = vb.accent, fontWeight = FontWeight.Black) }
                                Text("${machineKg.toInt()}", style = MonoMetric.copy(fontSize = 18.sp), color = ColorWhite)
                                IconButton(
                                    onClick = { machineKg += 5f },
                                    modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.surfaceElevated)
                                ) { Text("+", color = vb.accent, fontWeight = FontWeight.Black) }
                            }
                        }
                    }

                    EquipmentCategory.BODYWEIGHT -> {
                        if (userBodyweight > 0f)
                            Text("Peso corporal: ${userBodyweight.toInt()} kg", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                        else
                            Text("Sin peso adicional", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                    }
                }

                // ── Total + gap + use button ─────────────────────────────────
                if (total > 0f) {
                    HorizontalDivider(color = vb.border)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Peso total calculado", style = UppercaseLabel.copy(fontSize = 10.sp), color = vb.textMuted)
                            Text(
                                "${if (total == total.toLong().toFloat()) total.toInt() else total} kg",
                                style = MonoMetric.copy(fontSize = 22.sp), color = vb.accent
                            )
                            if (targetWeight > 0f) {
                                val gap = targetWeight - total
                                val gapText = when {
                                    gap == 0f -> "✅ Exactamente en la meta"
                                    gap > 0f -> "${gap} kg por debajo de la meta"
                                    else -> "${-gap} kg por encima de la meta"
                                }
                                val gapColor = when {
                                    gap == 0f -> ColorSuccess
                                    gap > 0f -> Color(0xFFFBBF24) // amber
                                    else -> Color(0xFF38BDF8) // sky
                                }
                                Text(gapText, style = MaterialTheme.typography.labelSmall, color = gapColor)
                            }
                        }
                        Button(
                            onClick = { onWeightApplied(total) },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
                        ) {
                            Text("Usar", fontWeight = FontWeight.Black)
                            Spacer(Modifier.width(4.dp))
                            Icon(Icons.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }
        }
    }
}

// ── Workout Summary Share Card (ported from WorkoutSummaryCard.tsx) ────────────

/**
 * Shareable workout summary card rendered inside the workout-complete section.
 * Uses Android's native share sheet instead of html2canvas.
 */
@Composable
private fun WorkoutSummaryShareCard(
    day: WorkoutDay,
    setsLogged: Int,
    duration: Int,
    streak: Int,
    userName: String?
) {
    val vb = LocalVoltBodyColors.current
    val context = LocalContext.current

    AppCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("⚡ VoltBody", style = UppercaseLabel.copy(fontSize = 10.sp), color = vb.accent)
                    Text(
                        "¡Entreno completado!",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black),
                        color = ColorWhite
                    )
                    if (!userName.isNullOrBlank())
                        Text(userName, style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                }
                Text("🎉", fontSize = 32.sp)
            }

            HorizontalDivider(color = vb.border)

            // Focus + date
            Text(day.focus, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = vb.accent)
            Text(
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("d 'de' MMMM, yyyy", java.util.Locale("es"))),
                style = MaterialTheme.typography.labelSmall, color = vb.textMuted
            )

            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                listOf(
                    Triple("$setsLogged", "SERIES", "💪"),
                    Triple(formatDuration(duration), "DURACIÓN", "⏱"),
                    Triple("$streak", "RACHA", "🔥")
                ).forEach { (value, label, icon) ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(icon, fontSize = 18.sp)
                        Text(value, style = MonoMetric.copy(fontSize = 16.sp), color = vb.accent)
                        Text(label, style = UppercaseLabel.copy(fontSize = 9.sp), color = vb.textMuted)
                    }
                }
            }

            // Exercise list (first 5)
            day.exercises.take(5).forEach { ex ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(ex.name, style = MaterialTheme.typography.bodySmall, color = ColorWhite, modifier = Modifier.weight(1f))
                    Text(
                        "${ex.sets}×${ex.reps}",
                        style = MaterialTheme.typography.labelSmall.copy(fontFamily = MonoMetric.fontFamily),
                        color = vb.textMuted
                    )
                }
            }
            if (day.exercises.size > 5)
                Text("+ ${day.exercises.size - 5} más", style = MaterialTheme.typography.labelSmall, color = vb.textMuted)

            HorizontalDivider(color = vb.border)

            // Share button
            Button(
                onClick = {
                    val dateStr = java.time.LocalDate.now().format(
                        java.time.format.DateTimeFormatter.ofPattern("d/MM/yyyy")
                    )
                    val text = buildString {
                        appendLine(context.getString(R.string.share_workout_header))
                        appendLine()
                        appendLine(context.getString(R.string.share_workout_focus_prefix, day.focus))
                        appendLine(context.getString(R.string.share_workout_date_prefix, dateStr))
                        appendLine()
                        appendLine(context.getString(R.string.share_workout_stats, setsLogged, formatDuration(duration), streak))
                        appendLine()
                        day.exercises.take(5).forEach { ex -> appendLine("• ${ex.name} — ${ex.sets}×${ex.reps}") }
                        if (day.exercises.size > 5)
                            appendLine(context.getString(R.string.share_workout_more_exercises, day.exercises.size - 5))
                        appendLine()
                        appendLine(context.getString(R.string.share_workout_hashtags))
                    }
                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                        putExtra(Intent.EXTRA_TEXT, text)
                        type = "text/plain"
                    }
                    context.startActivity(
                        Intent.createChooser(sendIntent, context.getString(R.string.share_workout_chooser_title))
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
            ) {
                Icon(Icons.Filled.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(context.getString(R.string.share_workout_button), fontWeight = FontWeight.Black)
            }
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}"
}
