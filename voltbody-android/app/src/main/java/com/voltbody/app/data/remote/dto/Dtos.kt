package com.voltbody.app.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.voltbody.app.domain.model.*

// ── Auth ─────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val email: String,
    val password: String
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String
)

@JsonClass(generateAdapter = true)
data class AuthResponseDto(
    val token: String,
    val user: UserDto,
    val profile: UserProfile? = null,
    val routine: List<WorkoutDay>? = null,
    val diet: DietPlan? = null,
    val insights: Insights? = null,
    @Json(name = "profilePhoto") val profilePhoto: String? = null,
    @Json(name = "motivationPhrase") val motivationPhrase: String? = null,
    @Json(name = "motivationPhoto") val motivationPhoto: String? = null
)

@JsonClass(generateAdapter = true)
data class UserDto(
    val id: String,
    val email: String,
    val name: String?
)

// ── Profile ───────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    val profile: UserProfile? = null,
    val routine: List<WorkoutDay>? = null,
    val diet: DietPlan? = null,
    val insights: Insights? = null,
    @Json(name = "profilePhoto") val profilePhoto: String? = null,
    @Json(name = "motivationPhrase") val motivationPhrase: String? = null,
    @Json(name = "motivationPhoto") val motivationPhoto: String? = null,
    val theme: String? = null
)

// ── Workout Logs ─────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class WorkoutLogDto(
    val date: String,
    @Json(name = "exerciseId") val exerciseId: String,
    val weight: Float,
    val reps: Int,
    val duration: Int? = null,
    val rpe: Int? = null,
    val rir: Int? = null
)

@JsonClass(generateAdapter = true)
data class SyncLogsRequest(
    val logs: List<WorkoutLogDto>
)

@JsonClass(generateAdapter = true)
data class WeightLogDto(
    val date: String,
    val weight: Float
)

@JsonClass(generateAdapter = true)
data class SyncWeightLogsRequest(
    val logs: List<WeightLogDto>
)

// ── AI ────────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class GeneratePlanRequest(
    val profile: UserProfile
)

@JsonClass(generateAdapter = true)
data class GeneratePlanResponse(
    val routine: List<WorkoutDay>,
    val diet: DietPlan,
    val insights: Insights
)

@JsonClass(generateAdapter = true)
data class GenerateAlternativeMealRequest(
    val oldMeal: Meal,
    val profile: UserProfile
)

@JsonClass(generateAdapter = true)
data class ProgressReportRequest(
    val profile: UserProfile,
    val logs: List<WorkoutLogDto>,
    val routine: List<WorkoutDay>,
    val diet: DietPlan?,
    val progressPhotos: List<ProgressPhotoDto>
)

@JsonClass(generateAdapter = true)
data class ProgressPhotoDto(
    val date: String,
    val url: String
)

@JsonClass(generateAdapter = true)
data class ProgressReportResponse(
    val overallScore: Int,
    val progressPercent: Int,
    val consistencyPercent: Int,
    val nutritionPercent: Int,
    val trainingExecutionPercent: Int,
    val weeksToVisibleChange: Int,
    val summary: String,
    val improvements: List<String>,
    val nextActions: List<String>
)
