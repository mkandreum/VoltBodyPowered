package com.voltbody.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.voltbody.app.domain.model.AppTab
import com.voltbody.app.service.VoltBodyNotificationService
import com.voltbody.app.ui.components.ToastOverlay
import com.voltbody.app.ui.components.VoltBodyBottomNav
import com.voltbody.app.ui.navigation.Screen
import com.voltbody.app.ui.navigation.VoltBodyNavHost
import com.voltbody.app.ui.theme.*
import com.voltbody.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var notificationService: VoltBodyNotificationService

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        notificationService.createChannels()

        setContent {
            val appViewModel: AppViewModel = hiltViewModel()
            val hasHydrated by appViewModel.hasHydrated.collectAsState()
            val theme by appViewModel.theme.collectAsState()

            // Keep splash until hydrated
            splashScreen.setKeepOnScreenCondition { !hasHydrated }

            VoltBodyTheme(appTheme = theme) {
                VoltBodyRoot(appViewModel = appViewModel)
            }
        }
    }
}

@Composable
private fun VoltBodyRoot(appViewModel: AppViewModel) {
    val navController = rememberNavController()
    val isAuthenticated by appViewModel.isAuthenticated.collectAsState()
    val isOnboarded by appViewModel.isOnboarded.collectAsState()
    val currentTab by appViewModel.currentTab.collectAsState()
    val toasts by appViewModel.toasts.collectAsState()

    val showBottomNav = isAuthenticated && isOnboarded

    // Sync tab with nav controller
    LaunchedEffect(currentTab) {
        if (!showBottomNav) return@LaunchedEffect
        val route = currentTab.toRoute()
        val current = navController.currentDestination?.route
        if (route != current) {
            navController.navigate(route) {
                popUpTo(Screen.Home.route) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            containerColor = androidx.compose.ui.graphics.Color.Transparent,
            contentColor = LocalVoltBodyColors.current.textPrimary
        ) { padding ->
            VoltBodyNavHost(
                navController = navController,
                appViewModel = appViewModel,
                modifier = Modifier.fillMaxSize().padding(padding)
            )
        }

        // Bottom nav (floating pill)
        AnimatedVisibility(
            visible = showBottomNav,
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            VoltBodyBottomNav(
                currentTab = currentTab,
                onTabSelected = { tab ->
                    appViewModel.setTab(tab)
                    navController.navigate(tab.toRoute()) {
                        popUpTo(Screen.Home.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }

        // Toast overlay
        ToastOverlay(
            toasts = toasts,
            onDismiss = appViewModel::dismissToast,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
        )
    }
}

private fun AppTab.toRoute() = when (this) {
    AppTab.HOME -> Screen.Home.route
    AppTab.WORKOUT -> Screen.Workout.route
    AppTab.DIET -> Screen.Diet.route
    AppTab.CALENDAR -> Screen.Calendar.route
    AppTab.PROFILE -> Screen.Profile.route
}
