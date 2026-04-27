package com.voltbody.app.ui.screens.home

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.voltbody.app.domain.model.*
import com.voltbody.app.domain.usecase.*
import com.voltbody.app.ui.components.*
import com.voltbody.app.ui.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()

    if (!uiState.hasHydrated) {
        HomeShimmerSkeleton()
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(top = 60.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ── Header greeting ───────────────────────────────────────────────────
        HomeHeader(profile = uiState.profile, motivationPhrase = uiState.motivationPhrase)

        // ── Avatar + XP card ──────────────────────────────────────────────────
        AvatarXpCard(uiState = uiState)

        // ── Stats row ─────────────────────────────────────────────────────────
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatPill(
                value = "${uiState.streak}",
                label = "Racha",
                modifier = Modifier.weight(1f),
                accentColor = if (uiState.streak > 0) vb.accent else vb.textMuted
            )
            StatPill(value = "${uiState.workoutsThisWeek}", label = "Esta semana", modifier = Modifier.weight(1f))
            StatPill(value = "${uiState.totalSeries}", label = "Series totales", modifier = Modifier.weight(1f))
        }

        // ── Recovery score banner ─────────────────────────────────────────────
        uiState.recoveryAdvice?.let { advice ->
            RecoveryBannerCard(advice = advice, score = uiState.recoveryScore)
        } ?: RecoveryCheckInCard(onCheckIn = viewModel::addRecoveryLog)

        // ── Fatigue radar ─────────────────────────────────────────────────────
        if (uiState.fatigueEntries.isNotEmpty()) {
            FatigueCard(entries = uiState.fatigueEntries)
        }

        // ── Today's workout ───────────────────────────────────────────────────
        uiState.todayWorkout?.let { workout ->
            TodayWorkoutCard(workout = workout, progress = uiState.todayProgress)
        }

        // ── BLE Heart rate ────────────────────────────────────────────────────
        BleHeartRateCard(
            bleState = uiState.bleState,
            heartRate = uiState.heartRate,
            deviceName = uiState.bleDeviceName,
            onConnect = viewModel::connectBle,
            onDisconnect = viewModel::disconnectBle
        )

        // ── Weight chart ──────────────────────────────────────────────────────
        if (uiState.weightChartData.any { it != null }) {
            WeightChartCard(data = uiState.weightChartData, labels = uiState.weightChartLabels)
        }

        // ── AI Progress report button ─────────────────────────────────────────
        AiProgressReportCard(
            report = uiState.progressReport,
            isLoading = uiState.reportLoading,
            onGenerate = viewModel::generateProgressReport
        )
    }
}

// ── Sub-composables ───────────────────────────────────────────────────────────

@Composable
private fun HomeHeader(profile: UserProfile?, motivationPhrase: String) {
    val vb = LocalVoltBodyColors.current
    val hour = LocalDate.now().let { java.time.LocalTime.now().hour }
    val greeting = when {
        hour < 12 -> "Buenos días"
        hour < 20 -> "Buenas tardes"
        else -> "Buenas noches"
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "$greeting, ${profile?.name ?: "Atleta"} 👋",
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black),
                color = ColorWhite
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = motivationPhrase,
                style = MaterialTheme.typography.bodySmall,
                color = vb.textMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
        Icon(Icons.Filled.Bolt, contentDescription = null, tint = vb.accent, modifier = Modifier.size(28.dp))
    }
}

@Composable
private fun AvatarXpCard(uiState: HomeUiState) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            // Avatar column
            Box(modifier = Modifier.weight(0.9f)) {
                uiState.profile?.let { p ->
                    Avatar3D(config = p.avatarConfig, gender = p.gender, modifier = Modifier.height(200.dp))
                }
            }

            // XP + stats column
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                NeonBadge(text = "NIVEL ${uiState.level}", color = vb.accent)

                // XP Progress bar
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("XP", style = UppercaseLabel, color = vb.textMuted)
                        Text("${uiState.xp} / ${uiState.xpForNext}", style = UppercaseLabel, color = vb.accent)
                    }
                    val xpProgress by animateFloatAsState(
                        targetValue = if (uiState.xpForNext > 0) uiState.xp.toFloat() / uiState.xpForNext else 0f,
                        animationSpec = tween(1000, easing = FastOutSlowInEasing),
                        label = "xp"
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(CircleShape)
                            .background(vb.border)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(xpProgress)
                                .clip(CircleShape)
                                .background(
                                    Brush.horizontalGradient(listOf(vb.accent.copy(alpha = 0.7f), vb.accent))
                                )
                        )
                    }
                }

                // Body stats
                if (uiState.profile != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MiniStat("${uiState.profile.weight.toInt()}kg", "Peso", modifier = Modifier.weight(1f))
                        MiniStat("${uiState.profile.height.toInt()}cm", "Altura", modifier = Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        uiState.bmi?.let { MiniStat(it, "IMC", modifier = Modifier.weight(1f)) }
                        uiState.tdee?.let { MiniStat("${it}kcal", "TDEE", modifier = Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun MiniStat(value: String, label: String, modifier: Modifier = Modifier) {
    val vb = LocalVoltBodyColors.current
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(vb.surface)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, style = MonoMetric.copy(fontSize = 14.sp), color = ColorWhite, fontWeight = FontWeight.Bold)
        Text(label, style = UppercaseLabel.copy(fontSize = 8.sp), color = vb.textMuted)
    }
}

@Composable
private fun RecoveryBannerCard(advice: RecoveryAdvice, score: Int) {
    val vb = LocalVoltBodyColors.current
    val bgColor = when (getRecoveryTier(score)) {
        RecoveryTier.LOW -> ColorInfo.copy(alpha = 0.12f)
        RecoveryTier.MODERATE -> ColorWarning.copy(alpha = 0.12f)
        RecoveryTier.GOOD -> ColorSuccess.copy(alpha = 0.12f)
        RecoveryTier.OPTIMAL -> vb.accent.copy(alpha = 0.12f)
    }
    val borderColor = when (getRecoveryTier(score)) {
        RecoveryTier.LOW -> ColorInfo.copy(alpha = 0.4f)
        RecoveryTier.MODERATE -> ColorWarning.copy(alpha = 0.4f)
        RecoveryTier.GOOD -> ColorSuccess.copy(alpha = 0.4f)
        RecoveryTier.OPTIMAL -> vb.accent.copy(alpha = 0.4f)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier.size(48.dp),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressRing(value = score / 100f, modifier = Modifier.size(48.dp), strokeWidth = 3.dp, fillColor = borderColor)
            Text("$score", style = UppercaseLabel.copy(fontSize = 10.sp), color = ColorWhite)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(advice.title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = ColorWhite)
            Text(advice.intensityLabel, style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
        }
    }
}

@Composable
private fun RecoveryCheckInCard(onCheckIn: (Float, Float?) -> Unit) {
    val vb = LocalVoltBodyColors.current
    var sleep by remember { mutableStateOf(7.5f) }
    var hrv by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    AppCard(onClick = { expanded = !expanded }) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Outlined.BedtimeOff, contentDescription = null, tint = vb.accent, modifier = Modifier.size(20.dp))
                Text("Check-in de recuperación", style = MaterialTheme.typography.titleSmall, color = ColorWhite)
            }
            Icon(if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = null, tint = vb.textMuted, modifier = Modifier.size(18.dp))
        }
        AnimatedVisibility(visible = expanded) {
            Column(modifier = Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Horas de sueño: ${sleep}h", style = MaterialTheme.typography.labelMedium, color = vb.textMuted)
                Slider(
                    value = sleep,
                    onValueChange = { sleep = (it * 2).toInt() / 2f },
                    valueRange = 3f..12f,
                    steps = 17,
                    colors = SliderDefaults.colors(thumbColor = vb.accent, activeTrackColor = vb.accent)
                )
                Button(
                    onClick = { onCheckIn(sleep, hrv.toFloatOrNull()); expanded = false },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
                ) { Text("Registrar recovery", fontWeight = FontWeight.Bold) }
            }
        }
    }
}

@Composable
private fun FatigueCard(entries: List<FatigueEntry>) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(title = "🔋 Fatiga muscular")
        Spacer(modifier = Modifier.height(12.dp))
        entries.take(4).forEach { entry ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(entry.muscleGroup, style = MaterialTheme.typography.bodySmall, color = vb.textMuted, modifier = Modifier.width(80.dp))
                val barColor = when (entry.status) {
                    FatigueStatus.FRESH -> ColorSuccess
                    FatigueStatus.MODERATE -> ColorWarning
                    FatigueStatus.HIGH -> ColorOrange
                    FatigueStatus.OVERREACHED -> ColorError
                }
                val animPct by animateFloatAsState(
                    targetValue = (entry.percent / 100f).coerceIn(0f, 1f),
                    animationSpec = tween(800),
                    label = "fatigue_${entry.muscleGroup}"
                )
                Box(modifier = Modifier.weight(1f).height(6.dp).clip(CircleShape).background(vb.border)) {
                    Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(animPct).clip(CircleShape).background(barColor))
                }
                Text("${entry.percent}%", style = UppercaseLabel.copy(fontSize = 9.sp), color = barColor, modifier = Modifier.width(32.dp))
            }
        }
    }
}

@Composable
private fun TodayWorkoutCard(workout: com.voltbody.app.domain.model.WorkoutDay, progress: Int) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(title = "🏋️ Entreno de hoy")
        Spacer(modifier = Modifier.height(8.dp))
        Text(workout.focus, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = vb.accent)
        Spacer(modifier = Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { progress / 100f },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
            color = vb.accent,
            trackColor = vb.border
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text("$progress% completado", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
        Spacer(modifier = Modifier.height(8.dp))
        workout.exercises.take(3).forEach { ex ->
            Text("• ${ex.name} — ${ex.sets}×${ex.reps}", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
        }
    }
}

@Composable
private fun BleHeartRateCard(
    bleState: String,
    heartRate: Int?,
    deviceName: String?,
    onConnect: () -> Unit,
    onDisconnect: () -> Unit
) {
    val vb = LocalVoltBodyColors.current
    val pulse by rememberInfiniteTransition(label = "hr_pulse").animateFloat(
        initialValue = 1f,
        targetValue = if (heartRate != null) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            tween(600, easing = FastOutSlowInEasing),
            RepeatMode.Reverse
        ),
        label = "pulse"
    )

    AppCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(
                    Icons.Filled.Favorite,
                    contentDescription = null,
                    tint = if (heartRate != null) ColorError else vb.textMuted,
                    modifier = Modifier.size(22.dp).graphicsLayer { scaleX = pulse; scaleY = pulse }
                )
                Column {
                    Text("Monitor cardíaco", style = MaterialTheme.typography.titleSmall, color = ColorWhite)
                    Text(
                        text = when (bleState) {
                            "connecting" -> "Buscando dispositivo..."
                            "connected" -> deviceName ?: "Conectado"
                            "error" -> "Error de conexión"
                            else -> "No conectado"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = vb.textMuted
                    )
                }
            }
            if (heartRate != null) {
                Text("$heartRate bpm", style = MonoMetric, color = ColorError, fontWeight = FontWeight.Black)
            } else {
                OutlinedButton(
                    onClick = if (bleState == "connected") onDisconnect else onConnect,
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, vb.accent.copy(alpha = 0.5f)),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        if (bleState == "connecting") "Buscando..." else "Conectar",
                        style = MaterialTheme.typography.labelMedium,
                        color = vb.accent
                    )
                }
            }
        }
    }
}

@Composable
private fun WeightChartCard(data: List<Float?>, labels: List<String>) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(title = "⚖️ Evolución de peso")
        Spacer(modifier = Modifier.height(12.dp))
        SimpleLineChart(
            data = data,
            labels = labels,
            modifier = Modifier.fillMaxWidth().height(100.dp),
            lineColor = vb.chartLine,
            fillColor = vb.chartFill
        )
    }
}

@Composable
private fun AiProgressReportCard(
    report: HomeUiState.ProgressReport?,
    isLoading: Boolean,
    onGenerate: () -> Unit
) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(title = "✨ Informe IA de progreso")
        Spacer(modifier = Modifier.height(8.dp))

        if (isLoading) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ShimmerBox(modifier = Modifier.fillMaxWidth().height(20.dp))
                ShimmerBox(modifier = Modifier.fillMaxWidth(0.7f).height(14.dp))
                ShimmerBox(modifier = Modifier.fillMaxWidth(0.8f).height(14.dp))
            }
        } else if (report != null) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                CircularProgressRing(value = report.overallScore / 100f, modifier = Modifier.size(64.dp))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${report.progressPercent}%", style = MonoMetric, color = vb.accent)
                    Text("Progreso", style = UppercaseLabel, color = vb.textMuted)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${report.consistencyPercent}%", style = MonoMetric, color = ColorSuccess)
                    Text("Consistencia", style = UppercaseLabel, color = vb.textMuted)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(report.summary, style = MaterialTheme.typography.bodySmall, color = vb.textMuted, maxLines = 4, overflow = TextOverflow.Ellipsis)
        } else {
            Text("Genera un análisis personalizado de tu progreso con IA", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onGenerate,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = vb.accent.copy(alpha = 0.15f), contentColor = vb.accent),
                border = BorderStroke(1.dp, vb.accent.copy(alpha = 0.3f))
            ) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Analizar con IA", fontWeight = FontWeight.Bold)
            }
        }
    }
}
