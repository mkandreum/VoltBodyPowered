package com.voltbody.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

// ── Workout log ───────────────────────────────────────────────────────────────

@Entity(
    tableName = "workout_logs",
    indices = [Index(value = ["date", "exerciseId"])]
)
data class WorkoutLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val exerciseId: String,
    val weight: Float,
    val reps: Int,
    val duration: Int? = null,
    val rpe: Int? = null,
    val rir: Int? = null,
    val synced: Boolean = false
)

// ── Weight log ────────────────────────────────────────────────────────────────

@Entity(
    tableName = "weight_logs",
    indices = [Index(value = ["date"], unique = true)]
)
data class WeightLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val weight: Float,
    val synced: Boolean = false
)

// ── Recovery log ──────────────────────────────────────────────────────────────

@Entity(
    tableName = "recovery_logs",
    indices = [Index(value = ["date"], unique = true)]
)
data class RecoveryLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val sleepHours: Float,
    val hrv: Float? = null,
    val score: Int
)

// ── Progress photos ───────────────────────────────────────────────────────────

@Entity(tableName = "progress_photos")
data class ProgressPhotoEntity(
    @PrimaryKey val date: String,
    val url: String
)
