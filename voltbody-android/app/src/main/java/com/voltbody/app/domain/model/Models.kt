package com.voltbody.app.domain.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ── User & Auth ──────────────────────────────────────────────────────────────

data class User(
    val id: String,
    val email: String,
    val name: String?
)

data class AuthState(
    val token: String,
    val user: User
)

// ── Profile ───────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class MealTimes(
    val breakfast: String = "08:00",
    val brunch: String = "11:00",
    val lunch: String = "14:00",
    val snack: String = "17:00",
    val dinner: String = "21:00"
)

@JsonClass(generateAdapter = true)
data class FoodPreferences(
    val vegetables: List<String> = emptyList(),
    val carbs: List<String> = emptyList(),
    val proteins: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class WeeklySpecialSession(
    val enabled: Boolean = false,
    val activity: String = "",
    val day: String = "",
    val durationMinutes: Int = 60
)

@JsonClass(generateAdapter = true)
data class AvatarConfig(
    val muscleMass: Float = 0.5f,
    val bodyFat: Float = 0.5f
)

@JsonClass(generateAdapter = true)
data class UserProfile(
    val name: String = "",
    val age: Int = 25,
    val weight: Float = 70f,
    val height: Float = 170f,
    val gender: String = "Masculino",
    val goal: String = "",
    @Json(name = "currentState") val currentState: String = "",
    val schedule: String = "",
    @Json(name = "workHours") val workHours: String = "",
    @Json(name = "trainingDaysPerWeek") val trainingDaysPerWeek: Int = 3,
    @Json(name = "sessionMinutes") val sessionMinutes: Int = 60,
    @Json(name = "goalDirection") val goalDirection: String = "Ganar",
    @Json(name = "goalTargetKg") val goalTargetKg: Float = 5f,
    @Json(name = "goalTimelineMonths") val goalTimelineMonths: Int = 3,
    @Json(name = "mealTimes") val mealTimes: MealTimes = MealTimes(),
    @Json(name = "foodPreferences") val foodPreferences: FoodPreferences = FoodPreferences(),
    @Json(name = "weeklySpecialSession") val weeklySpecialSession: WeeklySpecialSession = WeeklySpecialSession(),
    @Json(name = "avatarConfig") val avatarConfig: AvatarConfig = AvatarConfig(),
    @Json(name = "specialDish") val specialDish: Map<String, Any>? = null,
    @Json(name = "theme") val theme: String? = null,
    @Json(name = "motivationPhrase") val motivationPhrase: String? = null,
    @Json(name = "motivationPhoto") val motivationPhoto: String? = null,
    @Json(name = "profilePhoto") val profilePhoto: String? = null
)

// ── Workout ───────────────────────────────────────────────────────────────────

enum class ExerciseType { WEIGHTED, ISOMETRIC, BODYWEIGHT, CARDIO }

@JsonClass(generateAdapter = true)
data class Exercise(
    val id: String,
    val name: String,
    @Json(name = "nameEn") val nameEn: String? = null,
    val sets: Int = 3,
    val reps: String = "10-12",
    val weight: Float = 0f,
    @Json(name = "gifUrl") val gifUrl: String = "",
    @Json(name = "muscleGroup") val muscleGroup: String = "",
    val technique: String? = null,
    @Json(name = "exerciseType") val exerciseType: String? = null,
    @Json(name = "durationTarget") val durationTarget: Int? = null
)

@JsonClass(generateAdapter = true)
data class WorkoutDay(
    val day: String,
    val focus: String,
    val exercises: List<Exercise> = emptyList()
)

// ── Diet ──────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Macros(
    val protein: Int,
    val carbs: Int,
    val fat: Int
)

@JsonClass(generateAdapter = true)
data class Meal(
    val id: String,
    val name: String,
    val time: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val description: String = ""
)

@JsonClass(generateAdapter = true)
data class DietPlan(
    val dailyCalories: Int,
    val macros: Macros,
    val meals: List<Meal>
)

// ── Insights ──────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Insights(
    val sleepRecommendation: String = "",
    val estimatedResults: String = "",
    val dailyQuote: String = ""
)

// ── Logs ──────────────────────────────────────────────────────────────────────

data class WorkoutLog(
    val date: String,         // ISO datetime string
    val exerciseId: String,
    val weight: Float,
    val reps: Int,
    val duration: Int? = null,  // seconds (isometric/cardio)
    val rpe: Int? = null,       // Rate of Perceived Exertion 1-10
    val rir: Int? = null        // Reps In Reserve 0-4
)

data class WeightLog(
    val date: String,   // YYYY-MM-DD
    val weight: Float
)

data class ProgressPhoto(
    val date: String,
    val url: String
)

// ── Recovery ──────────────────────────────────────────────────────────────────

data class RecoveryLog(
    val date: String,         // YYYY-MM-DD
    val sleepHours: Float,
    val hrv: Float? = null,   // morning HRV in ms (RMSSD)
    val score: Int            // computed 0-100
)

// ── Achievements ──────────────────────────────────────────────────────────────

data class Achievement(
    val id: String,
    val label: String,
    val icon: String,
    val description: String,
    val unlockedAt: String? = null
)

// ── App ───────────────────────────────────────────────────────────────────────

enum class AppTheme(val key: String) {
    VERDE_NEGRO("verde-negro"),
    AGUAMARINA_NEGRO("aguamarina-negro"),
    OCASO_NEGRO("ocaso-negro");

    companion object {
        fun fromKey(key: String) = entries.firstOrNull { it.key == key } ?: VERDE_NEGRO
    }
}

enum class AppTab { HOME, WORKOUT, DIET, CALENDAR, PROFILE }

data class AppToast(
    val id: String,
    val type: ToastType,
    val title: String,
    val message: String? = null
)

enum class ToastType { SUCCESS, ERROR, INFO }

data class WeeklyGoal(
    val id: String,
    val label: String,
    val done: Boolean = false
)

data class ExerciseLibraryEntry(
    val id: String,
    val name: String,
    val nameEn: String? = null,
    val technique: String? = null,
    val muscleGroup: String,
    val defaultSets: Int = 3,
    val defaultReps: String = "10-12",
    val exerciseType: ExerciseType = ExerciseType.WEIGHTED
)
