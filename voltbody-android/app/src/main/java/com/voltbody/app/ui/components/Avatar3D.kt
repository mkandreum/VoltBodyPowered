package com.voltbody.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.voltbody.app.domain.model.AvatarConfig
import com.voltbody.app.ui.theme.*
import kotlin.math.*

/**
 * Avatar 3D — drawn entirely with Compose Canvas.
 * Replicates the Three.js box-geometry human avatar from Avatar3D.tsx.
 * A subtle sin-wave sway animation replaces the Three.js OrbitControls rotation.
 */
@Composable
fun Avatar3D(
    config: AvatarConfig = AvatarConfig(),
    gender: String = "Masculino",
    modifier: Modifier = Modifier
) {
    val vb = LocalVoltBodyColors.current
    val isFemale = gender == "Femenino"

    // Sway animation (replaces useFrame rotation)
    val infiniteTransition = rememberInfiniteTransition(label = "sway")
    val swayAngle by infiniteTransition.animateFloat(
        initialValue = -0.18f,
        targetValue = 0.18f,
        animationSpec = infiniteRepeatable(
            tween(2800, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sway_angle"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(280.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.verticalGradient(colors = listOf(Color(0xFF121212), Color(0xFF000000)))
            )
            .border(1.dp, vb.border, RoundedCornerShape(24.dp))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawAvatarScene(
                config = config,
                isFemale = isFemale,
                swayAngle = swayAngle,
                accent = vb.accent,
                size = size
            )
        }

        // Top-left badge (matches "ESTADO FÍSICO 3D" in the web app)
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp)
                .clip(RoundedCornerShape(50))
                .background(Color.Black.copy(alpha = 0.55f))
                .border(1.dp, vb.accent.copy(alpha = 0.3f), RoundedCornerShape(50))
                .padding(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Text(
                text = "ESTADO FÍSICO 3D",
                style = UppercaseLabel.copy(fontSize = 9.sp),
                color = vb.accent
            )
        }
    }
}

// ── Canvas drawing ─────────────────────────────────────────────────────────────

private val skinColor = Color(0xFFE0AC69)
private val hairColor = Color(0xFF2C222B)
private val shirtColor = Color(0xFF1A1A1A)
private val pantsColor = Color(0xFF0A0A0A)
private val shoeColor = Color(0xFFFFFFFF)
private val shadowColor = Color(0x66000000)

private fun DrawScope.drawAvatarScene(
    config: AvatarConfig,
    isFemale: Boolean,
    swayAngle: Float,
    accent: Color,
    size: Size
) {
    val cx = size.width / 2f
    val cy = size.height / 2f

    // Apply sway as an X-offset for the perspective illusion
    val swayOffset = swayAngle * 24f

    val muscleScale = 1f + config.muscleMass * 0.4f
    val fatScale = 1f + config.bodyFat * 0.4f

    val shoulderW = (if (isFemale) 0.6f else 0.85f) * muscleScale
    val torsoW = (if (isFemale) 0.55f else 0.65f) * fatScale
    val hipW = (if (isFemale) 0.75f else 0.65f) * fatScale

    // Base unit in pixels — avatar fills about 80% of the card height
    val unit = (size.height * 0.08f)
    val xc = cx + swayOffset

    // ── Ground shadow ─────────────────────────────────────────────────────────
    drawOval(
        color = shadowColor,
        topLeft = Offset(xc - unit * 2.2f, size.height - unit * 1.6f),
        size = Size(unit * 4.4f, unit * 0.6f)
    )

    // ── Legs ──────────────────────────────────────────────────────────────────
    val legY = size.height - unit * 1.5f
    val legH = unit * 2.2f
    val legW = unit * 0.6f * muscleScale
    val hipOffset = hipW * unit * 0.9f

    // Left leg (skin)
    drawRoundRect(
        color = skinColor,
        topLeft = Offset(xc - hipOffset - legW / 2, legY - legH),
        size = Size(legW, legH),
        cornerRadius = CornerRadius(unit * 0.2f)
    )
    // Right leg (skin)
    drawRoundRect(
        color = skinColor,
        topLeft = Offset(xc + hipOffset - legW / 2, legY - legH),
        size = Size(legW, legH),
        cornerRadius = CornerRadius(unit * 0.2f)
    )

    // Shorts (overlap bottom of torso / top of legs)
    val shortsH = unit * 1.2f
    val torsoWidth = torsoW * unit * 2.2f
    drawRoundRect(
        color = pantsColor,
        topLeft = Offset(xc - hipW * unit, legY - legH - shortsH * 0.4f),
        size = Size(hipW * unit * 2f, shortsH),
        cornerRadius = CornerRadius(unit * 0.15f)
    )

    // Shoes
    val shoeH = unit * 0.45f
    val shoeW = legW * 1.2f
    // Left shoe
    drawRoundRect(
        color = shoeColor,
        topLeft = Offset(xc - hipOffset - shoeW / 2, legY - shoeH),
        size = Size(shoeW, shoeH),
        cornerRadius = CornerRadius(unit * 0.15f)
    )
    // Right shoe
    drawRoundRect(
        color = shoeColor,
        topLeft = Offset(xc + hipOffset - shoeW / 2, legY - shoeH),
        size = Size(shoeW, shoeH),
        cornerRadius = CornerRadius(unit * 0.15f)
    )

    // ── Torso (shirt) ─────────────────────────────────────────────────────────
    val torsoY = legY - legH - shortsH - unit * 2.6f
    val torsoH = unit * 2.8f
    drawRoundRect(
        color = shirtColor,
        topLeft = Offset(xc - torsoWidth / 2, torsoY),
        size = Size(torsoWidth, torsoH),
        cornerRadius = CornerRadius(unit * 0.2f)
    )

    // Shoulder/chest accent
    val shoulderWidth = shoulderW * unit * 2.2f
    drawRoundRect(
        color = shirtColor.copy(alpha = 0.9f),
        topLeft = Offset(xc - shoulderWidth / 2, torsoY),
        size = Size(shoulderWidth, unit * 1.4f),
        cornerRadius = CornerRadius(unit * 0.2f)
    )

    // Neon logo on shirt
    drawRoundRect(
        color = accent.copy(alpha = 0.85f),
        topLeft = Offset(xc - unit * 0.4f, torsoY + unit * 0.5f),
        size = Size(unit * 0.8f, unit * 0.8f),
        cornerRadius = CornerRadius(unit * 0.1f)
    )

    // ── Arms ──────────────────────────────────────────────────────────────────
    val armW = unit * 0.55f * muscleScale
    val armH = unit * 2.2f
    val armY = torsoY + unit * 0.4f
    val armOffset = torsoWidth / 2 + armW * 0.4f

    // Left arm
    drawRoundRect(
        color = skinColor,
        topLeft = Offset(xc - armOffset - armW / 2, armY),
        size = Size(armW, armH),
        cornerRadius = CornerRadius(unit * 0.2f)
    )
    // Left sleeve
    drawRoundRect(
        color = shirtColor,
        topLeft = Offset(xc - armOffset - armW / 2, armY),
        size = Size(armW, unit * 1.0f),
        cornerRadius = CornerRadius(unit * 0.2f)
    )

    // Right arm
    drawRoundRect(
        color = skinColor,
        topLeft = Offset(xc + armOffset - armW / 2, armY),
        size = Size(armW, armH),
        cornerRadius = CornerRadius(unit * 0.2f)
    )
    // Right sleeve
    drawRoundRect(
        color = shirtColor,
        topLeft = Offset(xc + armOffset - armW / 2, armY),
        size = Size(armW, unit * 1.0f),
        cornerRadius = CornerRadius(unit * 0.2f)
    )

    // ── Neck ─────────────────────────────────────────────────────────────────
    val neckW = unit * 0.45f
    val neckH = unit * 0.6f
    drawRoundRect(
        color = skinColor,
        topLeft = Offset(xc - neckW / 2, torsoY - neckH),
        size = Size(neckW, neckH + unit * 0.1f),
        cornerRadius = CornerRadius(unit * 0.1f)
    )

    // ── Head ─────────────────────────────────────────────────────────────────
    val headW = unit * 1.1f
    val headH = unit * 1.3f
    val headY = torsoY - neckH - headH
    drawRoundRect(
        color = skinColor,
        topLeft = Offset(xc - headW / 2, headY),
        size = Size(headW, headH),
        cornerRadius = CornerRadius(unit * 0.3f)
    )

    // Hair
    val hairH = unit * 0.4f
    drawRoundRect(
        color = hairColor,
        topLeft = Offset(xc - headW / 2 - unit * 0.05f, headY),
        size = Size(headW + unit * 0.1f, hairH),
        cornerRadius = CornerRadius(unit * 0.25f)
    )

    // Female long hair
    if (isFemale) {
        drawRoundRect(
            color = hairColor,
            topLeft = Offset(xc - headW / 2 - unit * 0.05f, headY),
            size = Size(unit * 0.3f, headH * 1.6f),
            cornerRadius = CornerRadius(unit * 0.15f)
        )
        drawRoundRect(
            color = hairColor,
            topLeft = Offset(xc + headW / 2 - unit * 0.25f, headY),
            size = Size(unit * 0.3f, headH * 1.6f),
            cornerRadius = CornerRadius(unit * 0.15f)
        )
    }

    // Eyes
    val eyeSize = unit * 0.13f
    val eyeY = headY + headH * 0.35f
    drawCircle(color = Color.Black, radius = eyeSize, center = Offset(xc - unit * 0.22f, eyeY))
    drawCircle(color = Color.Black, radius = eyeSize, center = Offset(xc + unit * 0.22f, eyeY))

    // Eye white highlights
    drawCircle(color = Color.White.copy(alpha = 0.7f), radius = eyeSize * 0.4f, center = Offset(xc - unit * 0.19f, eyeY - eyeSize * 0.3f))
    drawCircle(color = Color.White.copy(alpha = 0.7f), radius = eyeSize * 0.4f, center = Offset(xc + unit * 0.25f, eyeY - eyeSize * 0.3f))

    // ── Neon accent glow on logo ───────────────────────────────────────────────
    drawRoundRect(
        color = accent.copy(alpha = 0.35f),
        topLeft = Offset(xc - unit * 0.6f, torsoY + unit * 0.3f),
        size = Size(unit * 1.2f, unit * 1.2f),
        cornerRadius = CornerRadius(unit * 0.15f)
    )
}

private val EaseInOutSine = CubicBezierEasing(0.37f, 0f, 0.63f, 1f)
