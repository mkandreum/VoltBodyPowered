package com.voltbody.app.ui.screens.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.voltbody.app.domain.model.*
import com.voltbody.app.ui.components.*
import com.voltbody.app.ui.theme.*

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()

    // Photo pickers
    val profilePhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.toString()?.let { viewModel.setProfilePhotoUri(it) }
    }
    val progressPhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.toString()?.let { viewModel.addProgressPhotoUri(it) }
    }
    val motivationPhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        viewModel.setMotivationPhoto(uri?.toString())
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(vb.bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(top = 60.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Perfil", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black), color = ColorWhite)

        // ── Profile card ──────────────────────────────────────────────────────
        ProfileHeaderCard(
            profile = uiState.profile,
            profilePhoto = uiState.profilePhoto,
            level = uiState.level,
            xp = uiState.xp,
            streak = uiState.streak,
            onPickPhoto = { profilePhotoPicker.launch("image/*") },
            onSaveDimensions = viewModel::updateProfileDimensions
        )

        // ── Fitness stat bars ─────────────────────────────────────────────────
        FitnessStatBarsCard(stats = uiState.fitnessStats)

        // ── Progress photos ───────────────────────────────────────────────────
        ProgressPhotosCard(
            progressPhotos = uiState.progressPhotos,
            onAddPhoto = { progressPhotoPicker.launch("image/*") }
        )

        // ── Weight log ────────────────────────────────────────────────────────
        WeightLogCard(
            currentWeight = uiState.profile?.weight ?: 70f,
            lastLogWeight = uiState.lastWeightLog,
            weightLogHistory = uiState.weightLogHistory,
            onAddWeight = viewModel::addWeightLog
        )

        // ── Personal records ──────────────────────────────────────────────────
        if (uiState.personalRecords.isNotEmpty()) {
            PersonalRecordsCard(records = uiState.personalRecords)
        }

        // ── Motivation ────────────────────────────────────────────────────────
        MotivationCard(
            phrase = uiState.motivationPhrase,
            photo = uiState.motivationPhoto,
            onPhraseChange = viewModel::setMotivationPhrase,
            onPickPhoto = { motivationPhotoPicker.launch("image/*") }
        )

        // ── Themes ────────────────────────────────────────────────────────────
        ThemeSelectorCard(
            currentTheme = uiState.theme,
            onSelectTheme = viewModel::setTheme
        )

        // ── Achievements ──────────────────────────────────────────────────────
        AchievementsCard(achievements = uiState.achievements)

        // ── Weekly Goals ─────────────────────────────────────────────────────
        WeeklyGoalsCard(goals = uiState.weeklyGoals, onToggle = viewModel::toggleGoal)

        // ── Notifications ─────────────────────────────────────────────────────
        NotificationsCard(enabled = uiState.notificationsEnabled, onToggle = viewModel::toggleNotifications)

        // ── Logout ────────────────────────────────────────────────────────────
        OutlinedButton(
            onClick = { viewModel.logout(); onLogout() },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, ColorError.copy(0.5f))
        ) {
            Icon(Icons.Outlined.Logout, contentDescription = null, tint = ColorError, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Cerrar sesión", color = ColorError, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ProfileHeaderCard(
    profile: UserProfile?,
    profilePhoto: String?,
    level: Int,
    xp: Int,
    streak: Int,
    onPickPhoto: () -> Unit,
    onSaveDimensions: (Float, Float) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    var isEditing by remember { mutableStateOf(false) }
    var editWeight by remember(profile?.weight) { mutableStateOf(String.format("%.1f", profile?.weight ?: 70f)) }
    var editHeight by remember(profile?.height) { mutableStateOf(String.format("%.0f", profile?.height ?: 170f)) }

    AppCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            // Avatar photo
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(vb.surfaceElevated)
                    .border(2.dp, vb.accent.copy(0.5f), CircleShape)
                    .clickable { onPickPhoto() },
                contentAlignment = Alignment.Center
            ) {
                if (profilePhoto != null) {
                    AsyncImage(
                        model = profilePhoto,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(CircleShape)
                    )
                } else {
                    Icon(Icons.Filled.Person, contentDescription = null, tint = vb.textMuted, modifier = Modifier.size(36.dp))
                }
                // Camera overlay
                Box(
                    modifier = Modifier.align(Alignment.BottomEnd).size(22.dp).clip(CircleShape).background(vb.accent),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = ColorBlack, modifier = Modifier.size(12.dp))
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(profile?.name ?: "Atleta", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold), color = ColorWhite)
                NeonBadge("Nivel $level")
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    MicroStat("${xp}xp", "XP")
                    MicroStat("$streak", "Racha")
                    MicroStat("${profile?.weight?.toInt() ?: "—"}kg", "Peso")
                }
            }
            // Edit toggle
            IconButton(onClick = {
                if (isEditing) {
                    val w = editWeight.toFloatOrNull() ?: (profile?.weight ?: 70f)
                    val h = editHeight.toFloatOrNull() ?: (profile?.height ?: 170f)
                    onSaveDimensions(w, h)
                }
                isEditing = !isEditing
            }) {
                Icon(
                    if (isEditing) Icons.Filled.Check else Icons.Outlined.Edit,
                    contentDescription = null,
                    tint = if (isEditing) ColorSuccess else vb.textMuted,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
        if (profile != null) {
            Spacer(modifier = Modifier.height(12.dp))
            AccentDivider()
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                if (isEditing) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Peso (kg)", style = UppercaseLabel.copy(fontSize = 8.sp), color = vb.textMuted)
                        OutlinedTextField(
                            value = editWeight,
                            onValueChange = { editWeight = it },
                            modifier = Modifier.width(80.dp),
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodySmall.copy(color = ColorWhite, textAlign = TextAlign.Center),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = vb.accent,
                                unfocusedBorderColor = vb.border
                            )
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Altura (cm)", style = UppercaseLabel.copy(fontSize = 8.sp), color = vb.textMuted)
                        OutlinedTextField(
                            value = editHeight,
                            onValueChange = { editHeight = it },
                            modifier = Modifier.width(80.dp),
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodySmall.copy(color = ColorWhite, textAlign = TextAlign.Center),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = vb.accent,
                                unfocusedBorderColor = vb.border
                            )
                        )
                    }
                    ProfileStat("${profile.age} años", "Edad")
                    ProfileStat("${profile.trainingDaysPerWeek}d/sem", "Entrenos")
                } else {
                    ProfileStat("${profile.height.toInt()}cm", "Altura")
                    ProfileStat(profile.currentState.split(" ").firstOrNull() ?: profile.currentState, "Nivel")
                    ProfileStat("${profile.trainingDaysPerWeek}d/sem", "Entrenos")
                    ProfileStat("${profile.sessionMinutes}min", "Sesión")
                }
            }
        }
    }
}

@Composable
private fun MicroStat(value: String, label: String) {
    val vb = LocalVoltBodyColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold), color = vb.accent)
        Text(label, style = UppercaseLabel.copy(fontSize = 8.sp), color = vb.textMuted)
    }
}

@Composable
private fun ProfileStat(value: String, label: String) {
    val vb = LocalVoltBodyColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = ColorWhite)
        Text(label, style = UppercaseLabel.copy(fontSize = 8.sp), color = vb.textMuted)
    }
}

@Composable
private fun WeightLogCard(
    currentWeight: Float,
    lastLogWeight: Float?,
    weightLogHistory: List<WeightLog>,
    onAddWeight: (Float) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    var weightInput by remember { mutableStateOf(currentWeight) }
    AppCard {
        SectionHeader(title = "⚖️ Registrar peso")
        Spacer(modifier = Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.weight(1f)) {
                IconButton(
                    onClick = { if (weightInput > 20f) weightInput -= 0.5f },
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)
                ) { Text("−", color = vb.accent) }
                Text("${String.format("%.1f", weightInput)}kg", style = MonoMetric, color = ColorWhite, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                IconButton(
                    onClick = { if (weightInput < 300f) weightInput += 0.5f },
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)
                ) { Text("+", color = vb.accent) }
            }
            Button(
                onClick = { onAddWeight(weightInput) },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = vb.accent, contentColor = ColorBlack)
            ) { Text("Guardar", fontWeight = FontWeight.Bold) }
        }
        lastLogWeight?.let {
            Spacer(modifier = Modifier.height(6.dp))
            val diff = weightInput - it
            val diffText = if (diff > 0) "+${String.format("%.1f", diff)}kg" else "${String.format("%.1f", diff)}kg"
            Text("Último registro: ${String.format("%.1f", it)}kg · $diffText", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
        }
        // Weight log history
        if (weightLogHistory.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            AccentDivider()
            Spacer(modifier = Modifier.height(8.dp))
            weightLogHistory.forEach { log ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(vb.surface)
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(log.date, style = MaterialTheme.typography.labelSmall, color = vb.textMuted)
                    Text("${String.format("%.1f", log.weight)} kg", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = vb.accent)
                }
            }
        }
    }
}

@Composable
private fun ThemeSelectorCard(currentTheme: AppTheme, onSelectTheme: (AppTheme) -> Unit) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(title = "🎨 Tema de la app")
        Spacer(modifier = Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AppTheme.entries.forEach { theme ->
                val themeColor = when (theme) {
                    AppTheme.VERDE_NEGRO -> NeonGreen
                    AppTheme.AGUAMARINA_NEGRO -> NeonAquamarine
                    AppTheme.OCASO_NEGRO -> NeonOcaso
                }
                val themeLabel = when (theme) {
                    AppTheme.VERDE_NEGRO -> "Verde"
                    AppTheme.AGUAMARINA_NEGRO -> "Aguamarina"
                    AppTheme.OCASO_NEGRO -> "Ocaso"
                }
                val isActive = currentTheme == theme
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isActive) themeColor.copy(0.15f) else vb.surface)
                        .border(1.dp, if (isActive) themeColor.copy(0.6f) else vb.border, RoundedCornerShape(12.dp))
                        .clickable { onSelectTheme(theme) }
                        .padding(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(modifier = Modifier.size(24.dp).clip(CircleShape).background(themeColor))
                    Text(themeLabel, style = UppercaseLabel.copy(fontSize = 8.sp), color = if (isActive) themeColor else vb.textMuted, textAlign = TextAlign.Center)
                    if (isActive) Icon(Icons.Filled.Check, contentDescription = null, tint = themeColor, modifier = Modifier.size(12.dp))
                }
            }
        }
    }
}

@Composable
private fun AchievementsCard(achievements: List<Achievement>) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(
            title = "🏆 Logros",
            trailing = { NeonBadge("${achievements.count { it.unlockedAt != null }}/${achievements.size}") }
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.heightIn(max = 300.dp)
        ) {
            items(achievements) { achievement ->
                val isUnlocked = achievement.unlockedAt != null
                Column(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isUnlocked) vb.accent.copy(0.1f) else vb.surface)
                        .border(1.dp, if (isUnlocked) vb.accent.copy(0.3f) else vb.border, RoundedCornerShape(12.dp))
                        .padding(8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(achievement.icon, fontSize = 20.sp, modifier = Modifier.graphicsLayer { alpha = if (isUnlocked) 1f else 0.35f })
                    Text(
                        achievement.label,
                        style = UppercaseLabel.copy(fontSize = 7.sp),
                        color = if (isUnlocked) vb.accent else vb.textMuted,
                        textAlign = TextAlign.Center,
                        maxLines = 2
                    )
                }
            }
        }
    }
}

@Composable
private fun WeeklyGoalsCard(goals: List<WeeklyGoal>, onToggle: (String) -> Unit) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(
            title = "🎯 Objetivos de la semana",
            trailing = { Text("${goals.count { it.done }}/${goals.size}", style = UppercaseLabel, color = vb.accent) }
        )
        Spacer(modifier = Modifier.height(12.dp))
        goals.forEach { goal ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (goal.done) ColorSuccess.copy(0.08f) else Color.Transparent)
                    .clickable { onToggle(goal.id) }
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier.size(22.dp).clip(CircleShape)
                        .background(if (goal.done) ColorSuccess else vb.surface)
                        .border(1.dp, if (goal.done) ColorSuccess.copy(0.5f) else vb.border, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (goal.done) Icon(Icons.Filled.Check, contentDescription = null, tint = ColorBlack, modifier = Modifier.size(12.dp))
                }
                Text(
                    goal.label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (goal.done) vb.textMuted else ColorWhite,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun NotificationsCard(enabled: Boolean, onToggle: (Boolean) -> Unit) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Outlined.Notifications, contentDescription = null, tint = vb.accent, modifier = Modifier.size(22.dp))
                Column {
                    Text("Recordatorios de entreno", style = MaterialTheme.typography.titleSmall, color = ColorWhite)
                    Text("Recibe avisos para no perderte ninguna sesión", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                }
            }
            Switch(
                checked = enabled,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = ColorBlack,
                    checkedTrackColor = vb.accent,
                    uncheckedTrackColor = vb.surface
                )
            )
        }
    }
}

// ── Fitness stat bars ──────────────────────────────────────────────────────────

@Composable
private fun FitnessStatBarsCard(stats: FitnessStats) {
    val vb = LocalVoltBodyColors.current
    val statBars = listOf(
        Triple("💪 Fuerza", stats.strength, vb.accent),
        Triple("🔥 Consistencia", stats.consistency, ColorWarning),
        Triple("⚡ Energía", stats.energy, ColorInfo)
    )
    AppCard {
        SectionHeader(title = "📊 Indicadores de forma")
        Spacer(modifier = Modifier.height(12.dp))
        statBars.forEach { (label, value, color) ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(label, style = MaterialTheme.typography.bodySmall, color = ColorWhite, modifier = Modifier.weight(1f))
                Text("$value%", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = color)
            }
            Box(
                modifier = Modifier.fillMaxWidth().height(6.dp)
                    .clip(CircleShape).background(vb.border)
            ) {
                Box(
                    modifier = Modifier.fillMaxHeight()
                        .fillMaxWidth(minOf(1f, value / 100f))
                        .clip(CircleShape).background(color)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
        }
    }
}

// ── Progress photos ────────────────────────────────────────────────────────────

@Composable
private fun ProgressPhotosCard(
    progressPhotos: List<ProgressPhoto>,
    onAddPhoto: () -> Unit
) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            SectionHeader(title = "📸 Fotos de progreso", modifier = Modifier.weight(1f))
            IconButton(
                onClick = onAddPhoto,
                modifier = Modifier.size(32.dp).clip(CircleShape).background(vb.accent.copy(0.15f))
                    .border(1.dp, vb.accent.copy(0.4f), CircleShape)
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Añadir foto", tint = vb.accent, modifier = Modifier.size(16.dp))
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        if (progressPhotos.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("Sube fotos para ver tu evolución 📷", style = MaterialTheme.typography.bodySmall, color = vb.textMuted, textAlign = TextAlign.Center)
            }
        } else {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                progressPhotos.takeLast(8).reversed().forEach { photo ->
                    Box(
                        modifier = Modifier.size(width = 100.dp, height = 130.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(vb.surface)
                            .border(1.dp, vb.border, RoundedCornerShape(12.dp))
                    ) {
                        AsyncImage(
                            model = photo.url,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        // Date overlay
                        Box(
                            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                                .background(Color.Black.copy(0.6f))
                                .padding(vertical = 3.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                photo.date.take(10),
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp),
                                color = Color.White.copy(0.85f)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── Personal records ───────────────────────────────────────────────────────────

@Composable
private fun PersonalRecordsCard(records: List<PersonalRecord>) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(
            title = "🏆 Récords personales",
            trailing = { NeonBadge("${records.size}") }
        )
        Spacer(modifier = Modifier.height(12.dp))
        records.forEach { pr ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(10.dp)).background(vb.surface)
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(pr.exerciseName, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), color = ColorWhite, maxLines = 1)
                    Text(pr.date, style = MaterialTheme.typography.labelSmall, color = vb.textMuted)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("${String.format("%.1f", pr.weight)}kg", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold), color = vb.accent)
                    Text("× ${pr.reps} reps", style = MaterialTheme.typography.labelSmall, color = vb.textMuted)
                }
            }
        }
    }
}

// ── Motivation section ─────────────────────────────────────────────────────────

@Composable
private fun MotivationCard(
    phrase: String,
    photo: String?,
    onPhraseChange: (String) -> Unit,
    onPickPhoto: () -> Unit
) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        SectionHeader(title = "💪 Motivación")
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = phrase,
            onValueChange = onPhraseChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Escribe tu frase motivacional…", style = MaterialTheme.typography.bodySmall, color = vb.textMuted) },
            singleLine = false,
            maxLines = 3,
            textStyle = MaterialTheme.typography.bodySmall.copy(color = ColorWhite),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = vb.accent,
                unfocusedBorderColor = vb.border
            )
        )
        Spacer(modifier = Modifier.height(10.dp))
        OutlinedButton(
            onClick = onPickPhoto,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, vb.accent.copy(0.4f))
        ) {
            Icon(Icons.Outlined.AddPhotoAlternate, contentDescription = null, tint = vb.accent, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Subir foto motivacional 📷", color = vb.accent, style = MaterialTheme.typography.labelMedium)
        }
        if (photo != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier.fillMaxWidth().height(160.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, vb.border, RoundedCornerShape(12.dp))
            ) {
                AsyncImage(
                    model = photo,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                // Phrase overlay
                Box(
                    modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                        .background(Color.Black.copy(0.55f)).padding(10.dp)
                ) {
                    Text(phrase, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium), color = Color.White)
                }
            }
        }
    }
}
