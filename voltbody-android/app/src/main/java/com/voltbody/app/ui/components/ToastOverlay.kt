package com.voltbody.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.voltbody.app.domain.model.AppToast
import com.voltbody.app.domain.model.ToastType
import com.voltbody.app.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun ToastOverlay(
    toasts: List<AppToast>,
    onDismiss: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        toasts.forEach { toast ->
            key(toast.id) {
                ToastItem(toast = toast, onDismiss = { onDismiss(toast.id) })
            }
        }
    }
}

@Composable
private fun ToastItem(toast: AppToast, onDismiss: () -> Unit) {
    val vb = LocalVoltBodyColors.current

    val bgColor = when (toast.type) {
        ToastType.SUCCESS -> ColorSuccess.copy(alpha = 0.15f)
        ToastType.ERROR -> ColorError.copy(alpha = 0.15f)
        ToastType.INFO -> ColorInfo.copy(alpha = 0.15f)
    }
    val borderColor = when (toast.type) {
        ToastType.SUCCESS -> ColorSuccess.copy(alpha = 0.4f)
        ToastType.ERROR -> ColorError.copy(alpha = 0.4f)
        ToastType.INFO -> ColorInfo.copy(alpha = 0.4f)
    }
    val icon = when (toast.type) {
        ToastType.SUCCESS -> Icons.Filled.CheckCircle
        ToastType.ERROR -> Icons.Filled.Error
        ToastType.INFO -> Icons.Filled.Info
    }
    val iconColor = when (toast.type) {
        ToastType.SUCCESS -> ColorSuccess
        ToastType.ERROR -> ColorError
        ToastType.INFO -> ColorInfo
    }

    // Auto-dismiss after 4 seconds
    LaunchedEffect(toast.id) {
        delay(4000)
        onDismiss()
    }

    AnimatedVisibility(
        visible = true,
        enter = slideInVertically { -it } + fadeIn(tween(200)),
        exit = slideOutVertically { -it } + fadeOut(tween(150))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(bgColor)
                .border(1.dp, borderColor, RoundedCornerShape(14.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(18.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(toast.title, style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold), color = ColorWhite)
                toast.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = vb.textMuted) }
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Filled.Close, contentDescription = null, tint = vb.textMuted, modifier = Modifier.size(14.dp))
            }
        }
    }
}
