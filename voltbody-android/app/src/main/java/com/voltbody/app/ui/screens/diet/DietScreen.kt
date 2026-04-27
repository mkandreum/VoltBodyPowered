package com.voltbody.app.ui.screens.diet

import androidx.compose.animation.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.voltbody.app.domain.model.*
import com.voltbody.app.ui.components.*
import com.voltbody.app.ui.theme.*

@Composable
fun DietScreen(
    viewModel: DietViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()
    val today = java.time.LocalDate.now().toString()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(vb.bg),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 60.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Plan Nutricional", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black), color = ColorWhite)
        }

        // ── Macros summary ────────────────────────────────────────────────────
        uiState.diet?.let { diet ->
            item {
                MacrosSummaryCard(diet = diet, eatenCalories = uiState.eatenCalories, totalMeals = diet.meals.size, eatenMeals = uiState.eatenMealIds.size)
            }

            // ── Meals ─────────────────────────────────────────────────────────
            items(diet.meals, key = { it.id }) { meal ->
                val isEaten = uiState.eatenMealIds.contains(meal.id)
                MealCard(
                    meal = meal,
                    isEaten = isEaten,
                    isSwapping = uiState.swappingMealId == meal.id,
                    onToggleEaten = { viewModel.toggleMealEaten(meal.id, today) },
                    onSwap = { viewModel.swapMeal(meal) }
                )
            }
        } ?: item {
            Box(
                modifier = Modifier.fillMaxWidth().padding(48.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🥗", fontSize = 40.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("No tienes plan nutricional", style = MaterialTheme.typography.titleMedium, color = vb.textMuted, textAlign = TextAlign.Center)
                }
            }
        }

        // ── Hydration tracker ─────────────────────────────────────────────────
        item {
            HydrationCard(glassCount = uiState.waterGlasses, onAddGlass = viewModel::addWaterGlass, onRemoveGlass = viewModel::removeWaterGlass)
        }
    }
}

@Composable
private fun MacrosSummaryCard(diet: DietPlan, eatenCalories: Int, totalMeals: Int, eatenMeals: Int) {
    val vb = LocalVoltBodyColors.current
    AppCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("Calorías objetivo", style = UppercaseLabel, color = vb.textMuted)
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("$eatenCalories", style = MonoMetric, color = vb.accent)
                    Text("/ ${diet.dailyCalories} kcal", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                }
            }
            CircularProgressRing(
                value = if (diet.dailyCalories > 0) eatenCalories.toFloat() / diet.dailyCalories else 0f,
                modifier = Modifier.size(52.dp),
                label = "$eatenMeals/$totalMeals"
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        // Macro bars
        val macros = listOf(
            Triple("Prot", diet.macros.protein, ColorInfo),
            Triple("HC", diet.macros.carbs, ColorWarning),
            Triple("Grasa", diet.macros.fat, ColorError)
        )
        macros.forEach { (label, grams, color) ->
            MacroBar(label = label, grams = grams, color = color)
            Spacer(modifier = Modifier.height(4.dp))
        }
    }
}

@Composable
private fun MacroBar(label: String, grams: Int, color: Color) {
    val vb = LocalVoltBodyColors.current
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = UppercaseLabel, color = vb.textMuted, modifier = Modifier.width(36.dp))
        Box(modifier = Modifier.weight(1f).height(6.dp).clip(CircleShape).background(vb.border)) {
            Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(minOf(1f, grams / 200f)).clip(CircleShape).background(color))
        }
        Text("${grams}g", style = UppercaseLabel, color = color, modifier = Modifier.width(36.dp))
    }
}

@Composable
private fun MealCard(
    meal: Meal,
    isEaten: Boolean,
    isSwapping: Boolean,
    onToggleEaten: () -> Unit,
    onSwap: () -> Unit
) {
    val vb = LocalVoltBodyColors.current
    var expanded by remember { mutableStateOf(false) }

    AppCard(onClick = { expanded = !expanded }) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            // Eaten toggle
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (isEaten) ColorSuccess.copy(0.15f) else vb.surface)
                    .border(1.dp, if (isEaten) ColorSuccess.copy(0.5f) else vb.border, CircleShape)
                    .clickable { onToggleEaten() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isEaten) Icons.Filled.Check else Icons.Outlined.RestaurantMenu,
                    contentDescription = null,
                    tint = if (isEaten) ColorSuccess else vb.textMuted,
                    modifier = Modifier.size(20.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(meal.name, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold), color = if (isEaten) vb.textMuted else ColorWhite)
                        Text(meal.time, style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("${meal.calories} kcal", style = MaterialTheme.typography.labelLarge, color = vb.accent)
                        Text("P:${meal.protein}g · HC:${meal.carbs}g · G:${meal.fat}g", style = MaterialTheme.typography.labelSmall, color = vb.textMuted)
                    }
                }

                AnimatedVisibility(visible = expanded) {
                    Column(modifier = Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (meal.description.isNotBlank()) {
                            Text(meal.description, style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                        }
                        Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                            if (isSwapping) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = vb.accent, strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Generando alternativa...", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
                            } else {
                                OutlinedButton(
                                    onClick = onSwap,
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, vb.accent.copy(0.4f)),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Outlined.AutoAwesome, contentDescription = null, modifier = Modifier.size(14.dp), tint = vb.accent)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Alternativa IA", style = MaterialTheme.typography.labelMedium, color = vb.accent)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HydrationCard(glassCount: Int, onAddGlass: () -> Unit, onRemoveGlass: () -> Unit) {
    val vb = LocalVoltBodyColors.current
    val targetGlasses = 8
    AppCard {
        SectionHeader(title = "💧 Hidratación")
        Spacer(modifier = Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("$glassCount / $targetGlasses vasos", style = MaterialTheme.typography.titleSmall, color = ColorWhite)
                Text("${(glassCount * 250)} ml de 2000 ml", style = MaterialTheme.typography.bodySmall, color = vb.textMuted)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = onRemoveGlass, enabled = glassCount > 0, modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.surface)) {
                    Text("−", color = vb.textMuted)
                }
                IconButton(onClick = onAddGlass, enabled = glassCount < 16, modifier = Modifier.size(36.dp).clip(CircleShape).background(vb.accent.copy(0.15f)).border(1.dp, vb.accent.copy(0.4f), CircleShape)) {
                    Text("+", color = vb.accent, fontWeight = FontWeight.Black)
                }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            repeat(targetGlasses) { i ->
                Box(modifier = Modifier.size(18.dp).clip(RoundedCornerShape(4.dp)).background(if (i < glassCount) ColorInfo else vb.border))
            }
        }
    }
}
