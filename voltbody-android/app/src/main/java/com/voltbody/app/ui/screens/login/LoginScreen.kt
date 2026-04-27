package com.voltbody.app.ui.screens.login

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.voltbody.app.data.remote.dto.LoginRequest
import com.voltbody.app.data.remote.dto.RegisterRequest
import com.voltbody.app.domain.model.*
import com.voltbody.app.ui.components.AppCard
import com.voltbody.app.ui.components.NeonBadge
import com.voltbody.app.ui.theme.*
import com.voltbody.app.ui.screens.login.LoginViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNeedsOnboarding: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val vb = LocalVoltBodyColors.current
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    var isLoginMode by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // React to auth result
    LaunchedEffect(uiState.authResult) {
        uiState.authResult?.let { result ->
            if (result.needsOnboarding) onNeedsOnboarding()
            else onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(vb.accentDim.copy(alpha = 0.12f), Color.Transparent),
                    center = androidx.compose.ui.geometry.Offset(0.15f, -0.1f),
                    radius = 800f
                )
            )
            .background(vb.bg)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
                .imePadding(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo / branding
            Spacer(modifier = Modifier.height(40.dp))
            Icon(
                imageVector = Icons.Filled.Bolt,
                contentDescription = null,
                tint = vb.accent,
                modifier = Modifier.size(52.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "VOLTBODY",
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.15.sp
                ),
                color = vb.accent
            )
            Text(
                text = "POWERED",
                style = UppercaseLabel.copy(letterSpacing = 0.25.sp),
                color = vb.textMuted
            )

            Spacer(modifier = Modifier.height(40.dp))

            AppCard(modifier = Modifier.fillMaxWidth()) {
                // Mode toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(vb.surface),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    listOf(true to "Iniciar sesión", false to "Crear cuenta").forEach { (mode, label) ->
                        val isSelected = isLoginMode == mode
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .then(
                                    if (isSelected) Modifier.background(vb.accent.copy(alpha = 0.15f))
                                    else Modifier
                                )
                                .clickable { isLoginMode = mode }
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelLarge,
                                color = if (isSelected) vb.accent else vb.textMuted,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Name field (register only)
                AnimatedVisibility(visible = !isLoginMode) {
                    Column {
                        VoltTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = "Nombre",
                            leadingIcon = Icons.Outlined.Person,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                            keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }

                // Email
                VoltTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Correo electrónico",
                    leadingIcon = Icons.Outlined.Email,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Password
                VoltTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Contraseña",
                    leadingIcon = Icons.Outlined.Lock,
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = null,
                                tint = vb.textMuted
                            )
                        }
                    }
                )

                // Error message
                AnimatedVisibility(visible = uiState.error != null) {
                    uiState.error?.let { err ->
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = err,
                            style = MaterialTheme.typography.bodySmall,
                            color = ColorError
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Submit button
                Button(
                    onClick = {
                        focusManager.clearFocus()
                        if (isLoginMode) {
                            viewModel.login(LoginRequest(email.trim(), password))
                        } else {
                            viewModel.register(RegisterRequest(email.trim(), password, name.trim()))
                        }
                    },
                    enabled = !uiState.isLoading && email.isNotBlank() && password.isNotBlank(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = vb.accent,
                        contentColor = ColorBlack
                    )
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            color = ColorBlack,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = if (isLoginMode) "Iniciar sesión" else "Crear cuenta",
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun VoltTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    enabled: Boolean = true,
    singleLine: Boolean = true
) {
    val vb = LocalVoltBodyColors.current

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, style = MaterialTheme.typography.bodyMedium, color = vb.textMuted) },
        leadingIcon = leadingIcon?.let { icon ->
            { Icon(imageVector = icon, contentDescription = null, tint = vb.textMuted, modifier = Modifier.size(20.dp)) }
        },
        trailingIcon = trailingIcon,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        enabled = enabled,
        singleLine = singleLine,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = vb.accent,
            unfocusedBorderColor = vb.border,
            focusedLabelColor = vb.accent,
            unfocusedLabelColor = vb.textMuted,
            focusedTextColor = ColorWhite,
            unfocusedTextColor = ColorWhite,
            cursorColor = vb.accent,
            focusedContainerColor = vb.surfaceElevated,
            unfocusedContainerColor = vb.surface,
        )
    )
}
