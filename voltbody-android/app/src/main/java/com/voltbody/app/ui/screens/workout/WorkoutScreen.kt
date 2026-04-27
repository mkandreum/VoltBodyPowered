package com.voltbody.app.ui.screens.workout

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
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

            // Workout complete celebration
            if (uiState.workoutComplete) {
                item {
                    WorkoutCompleteCard(
                        setsLogged = uiState.todaySetsLogged,
                        duration = uiState.sessionElapsed
                    )
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
private fun WorkoutCompleteCard(setsLogged: Int, duration: Int) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("🎉", fontSize = 40.sp)
            Text("¡Entreno completado!", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black), color = vb.accent, textAlign = TextAlign.Center)
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$setsLogged", style = MonoMetric, color = vb.accent)
                    Text("SERIES", style = UppercaseLabel, color = vb.textMuted)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(formatDuration(duration), style = MonoMetric, color = ColorSuccess)
                    Text("DURACIÓN", style = UppercaseLabel, color = vb.textMuted)
                }
            }
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

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}"
}
