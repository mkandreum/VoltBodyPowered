package com.voltbody.app.ui.screens.calendar

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.voltbody.app.domain.model.WorkoutDay
import com.voltbody.app.domain.usecase.WEEKDAY_LABELS
import com.voltbody.app.domain.usecase.getMondayFirstIndex
import com.voltbody.app.domain.usecase.mapRoutineByWeekday
import com.voltbody.app.ui.components.*
import com.voltbody.app.ui.theme.*
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(vb.bg),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 60.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Calendario", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black), color = ColorWhite)
        }

        // ── Month navigator ───────────────────────────────────────────────────
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = viewModel::prevMonth) {
                    Icon(Icons.Filled.ChevronLeft, contentDescription = null, tint = vb.textMuted)
                }
                Text(
                    "${uiState.displayMonth.month.getDisplayName(TextStyle.FULL, Locale("es")).replaceFirstChar { it.uppercase() }} ${uiState.displayMonth.year}",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = ColorWhite
                )
                IconButton(onClick = viewModel::nextMonth) {
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = vb.textMuted)
                }
            }
        }

        // ── Calendar grid ─────────────────────────────────────────────────────
        item {
            CalendarGrid(
                displayMonth = uiState.displayMonth,
                selectedDay = uiState.selectedDay,
                workoutDays = uiState.workoutDaysInMonth,
                completedDays = uiState.completedDaysInMonth,
                onDaySelected = viewModel::selectDay
            )
        }

        // ── Selected day details ──────────────────────────────────────────────
        uiState.selectedDayWorkout?.let { workout ->
            item {
                AppCard {
                    Text(
                        uiState.selectedDay?.format(DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale("es")))?.replaceFirstChar { it.uppercase() } ?: "",
                        style = MaterialTheme.typography.titleSmall,
                        color = vb.textMuted
                    )
                    Text(workout.focus, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black), color = vb.accent)
                    Spacer(modifier = Modifier.height(12.dp))
                    workout.exercises.forEach { ex ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(ex.name, style = MaterialTheme.typography.bodyMedium, color = ColorWhite, modifier = Modifier.weight(1f))
                            NeonBadge("${ex.sets}×${ex.reps}")
                        }
                    }
                }
            }
        }

        // ── Weekly summary stats ──────────────────────────────────────────────
        item {
            AppCard {
                SectionHeader(title = "📊 Esta semana")
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                    StatPill("${uiState.weekWorkouts}", "Entrenos", modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    StatPill("${uiState.weekSets}", "Series", modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    StatPill("${uiState.weekStreak}", "Racha", modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun CalendarGrid(
    displayMonth: YearMonth,
    selectedDay: LocalDate?,
    workoutDays: Set<LocalDate>,
    completedDays: Set<LocalDate>,
    onDaySelected: (LocalDate) -> Unit
) {
    val vb = LocalVoltBodyColors.current
    val today = LocalDate.now()

    // Day of week headers (Mon–Sun)
    Row(modifier = Modifier.fillMaxWidth()) {
        WEEKDAY_LABELS.forEach { (_, short, _) ->
            Text(
                short,
                style = UppercaseLabel.copy(fontSize = 9.sp),
                color = vb.textMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f)
            )
        }
    }
    Spacer(modifier = Modifier.height(6.dp))

    val firstDay = displayMonth.atDay(1)
    val startOffset = getMondayFirstIndex(firstDay)
    val daysInMonth = displayMonth.lengthOfMonth()

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        var dayCount = 1
        val totalCells = startOffset + daysInMonth
        val rows = (totalCells + 6) / 7

        repeat(rows) { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                repeat(7) { col ->
                    val cellIndex = row * 7 + col
                    if (cellIndex < startOffset || dayCount > daysInMonth) {
                        Box(modifier = Modifier.weight(1f).aspectRatio(1f))
                    } else {
                        val date = displayMonth.atDay(dayCount)
                        val isToday = date == today
                        val isSelected = date == selectedDay
                        val isWorkout = workoutDays.contains(date)
                        val isCompleted = completedDays.contains(date)

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isSelected -> vb.accent.copy(alpha = 0.3f)
                                        isToday -> vb.accent.copy(alpha = 0.12f)
                                        isCompleted -> ColorSuccess.copy(alpha = 0.12f)
                                        else -> Color.Transparent
                                    }
                                )
                                .border(
                                    width = if (isToday || isSelected) 1.dp else 0.dp,
                                    color = when {
                                        isSelected -> vb.accent
                                        isToday -> vb.accent.copy(0.5f)
                                        else -> Color.Transparent
                                    },
                                    shape = CircleShape
                                )
                                .clickable { onDaySelected(date) },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "$dayCount",
                                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal),
                                    color = when {
                                        isSelected -> vb.accent
                                        isToday -> vb.accent
                                        isCompleted -> ColorSuccess
                                        else -> ColorWhite
                                    }
                                )
                                if (isWorkout && !isCompleted) {
                                    Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(vb.accent.copy(0.7f)))
                                }
                                if (isCompleted) {
                                    Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(ColorSuccess))
                                }
                            }
                        }
                        dayCount++
                    }
                }
            }
        }
    }
}
