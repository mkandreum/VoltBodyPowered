package com.voltbody.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.voltbody.app.domain.model.AppTab
import com.voltbody.app.ui.theme.*

private data class NavItem(
    val tab: AppTab,
    val icon: ImageVector,
    val iconSelected: ImageVector,
    val label: String
)

@Composable
fun VoltBodyBottomNav(
    currentTab: AppTab,
    onTabSelected: (AppTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val vb = LocalVoltBodyColors.current
    val haptic = LocalHapticFeedback.current

    val leftItems = listOf(
        NavItem(AppTab.WORKOUT, Icons.Outlined.FitnessCenter, Icons.Filled.FitnessCenter, "Rutina"),
        NavItem(AppTab.DIET, Icons.Outlined.RestaurantMenu, Icons.Filled.RestaurantMenu, "Dieta"),
    )
    val rightItems = listOf(
        NavItem(AppTab.CALENDAR, Icons.Outlined.CalendarMonth, Icons.Filled.CalendarMonth, "Calendario"),
        NavItem(AppTab.PROFILE, Icons.Outlined.Person, Icons.Filled.Person, "Perfil"),
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
            .padding(bottom = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        // Pill container
        Row(
            modifier = Modifier
                .widthIn(max = 520.dp)
                .fillMaxWidth()
                .shadow(
                    elevation = 24.dp,
                    shape = CircleShape,
                    ambientColor = vb.accent.copy(alpha = 0.15f),
                    spotColor = vb.accent.copy(alpha = 0.1f)
                )
                .clip(CircleShape)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            vb.surfaceElevated.copy(alpha = 0.96f),
                            vb.surface.copy(alpha = 0.96f)
                        )
                    )
                )
                .border(1.dp, vb.border, CircleShape)
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left nav items
            leftItems.forEach { item ->
                NavButton(
                    item = item,
                    isActive = currentTab == item.tab,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onTabSelected(item.tab)
                    },
                    modifier = Modifier.weight(1f)
                )
            }

            // Center VoltBody button
            CenterVoltButton(
                isActive = currentTab == AppTab.HOME,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onTabSelected(AppTab.HOME)
                },
                modifier = Modifier.weight(1.6f)
            )

            // Right nav items
            rightItems.forEach { item ->
                NavButton(
                    item = item,
                    isActive = currentTab == item.tab,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onTabSelected(item.tab)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun NavButton(
    item: NavItem,
    isActive: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val vb = LocalVoltBodyColors.current
    val interactionSource = remember { MutableInteractionSource() }

    val iconScale by animateFloatAsState(
        targetValue = if (isActive) 1.1f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 400f),
        label = "icon_scale"
    )

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .then(
                if (isActive) Modifier.background(vb.accent.copy(alpha = 0.1f))
                else Modifier
            )
            .clickable(interactionSource = interactionSource, indication = null) { onClick() }
            .padding(horizontal = 4.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Icon(
            imageVector = if (isActive) item.iconSelected else item.icon,
            contentDescription = item.label,
            tint = if (isActive) vb.accent else vb.textMuted,
            modifier = Modifier
                .size(16.dp)
                .graphicsLayer { scaleX = iconScale; scaleY = iconScale }
        )
        AnimatedVisibility(
            visible = isActive,
            enter = fadeIn(tween(150)) + expandVertically(tween(150)),
            exit = fadeOut(tween(100)) + shrinkVertically(tween(100))
        ) {
            Text(
                text = item.label,
                style = UppercaseLabel.copy(fontSize = 8.sp, letterSpacing = 0.04.sp),
                color = vb.accent,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun CenterVoltButton(
    isActive: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val vb = LocalVoltBodyColors.current
    val interactionSource = remember { MutableInteractionSource() }

    val boltScale by animateFloatAsState(
        targetValue = if (isActive) 1.2f else 1f,
        animationSpec = spring(dampingRatio = 0.4f, stiffness = 300f),
        label = "bolt_scale"
    )

    Box(
        modifier = modifier
            .clip(CircleShape)
            .clickable(interactionSource = interactionSource, indication = null) { onClick() }
            .padding(horizontal = 4.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Bolt,
                contentDescription = null,
                tint = if (isActive) ColorWarning else vb.textMuted,
                modifier = Modifier
                    .size(20.dp)
                    .graphicsLayer { scaleX = boltScale; scaleY = boltScale }
            )
            Text(
                text = "VoltBody",
                style = UppercaseLabel.copy(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.06.sp
                ),
                color = if (isActive) vb.accent else vb.textMuted.copy(alpha = 0.7f)
            )
        }
    }
}
