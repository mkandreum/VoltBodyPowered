package com.voltbody.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.voltbody.app.MainActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VoltBodyNotificationService @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        const val CHANNEL_WORKOUT = "workout_reminders"
        const val CHANNEL_RECOVERY = "recovery_alerts"
        const val CHANNEL_ACHIEVEMENTS = "achievements"
        private const val NOTIFICATION_WORKOUT = 1001
        private const val NOTIFICATION_RECOVERY = 1002
        private const val NOTIFICATION_ACHIEVEMENT = 1003
    }

    fun createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            listOf(
                NotificationChannel(CHANNEL_WORKOUT, "Recordatorios de entreno", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Recordatorios diarios para no saltarse el entreno"
                },
                NotificationChannel(CHANNEL_RECOVERY, "Alertas de recuperación", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Avisos sobre tu estado de recuperación y fatiga"
                },
                NotificationChannel(CHANNEL_ACHIEVEMENTS, "Logros desbloqueados", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Notificaciones cuando desbloqueas un nuevo logro"
                }
            ).forEach { notificationManager.createNotificationChannel(it) }
        }
    }

    fun showWorkoutReminder(workoutName: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("tab", "workout")
        }
        val pendingIntent = PendingIntent.getActivity(
            context, NOTIFICATION_WORKOUT, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_WORKOUT)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("¡Es hora de entrenar! 🏋️")
            .setContentText("Tu sesión de $workoutName te está esperando.")
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIFICATION_WORKOUT, notification)
    }

    fun showAchievementUnlocked(icon: String, label: String, description: String) {
        val notification = NotificationCompat.Builder(context, CHANNEL_ACHIEVEMENTS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("$icon Logro desbloqueado: $label")
            .setContentText(description)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIFICATION_ACHIEVEMENT + label.hashCode(), notification)
    }

    fun showRecoveryAlert(score: Int, title: String) {
        val notification = NotificationCompat.Builder(context, CHANNEL_RECOVERY)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText("Recovery Score: $score/100")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIFICATION_RECOVERY, notification)
    }
}
