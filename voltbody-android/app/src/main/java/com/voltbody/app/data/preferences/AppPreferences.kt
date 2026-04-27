package com.voltbody.app.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.voltbody.app.domain.model.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "voltbody_prefs")

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext private val context: Context,
    private val moshi: Moshi
) {
    private val ds = context.dataStore

    companion object {
        val KEY_AUTH_TOKEN = stringPreferencesKey("auth_token")
        val KEY_USER_ID = stringPreferencesKey("user_id")
        val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        val KEY_USER_NAME = stringPreferencesKey("user_name")
        val KEY_IS_ONBOARDED = booleanPreferencesKey("is_onboarded")
        val KEY_THEME = stringPreferencesKey("theme")
        val KEY_PROFILE_JSON = stringPreferencesKey("profile_json")
        val KEY_ROUTINE_JSON = stringPreferencesKey("routine_json")
        val KEY_DIET_JSON = stringPreferencesKey("diet_json")
        val KEY_INSIGHTS_JSON = stringPreferencesKey("insights_json")
        val KEY_ACHIEVEMENTS_JSON = stringPreferencesKey("achievements_json")
        val KEY_WEEKLY_GOALS_JSON = stringPreferencesKey("weekly_goals_json")
        val KEY_MEAL_EATEN_JSON = stringPreferencesKey("meal_eaten_json")
        val KEY_MOTIVATION_PHRASE = stringPreferencesKey("motivation_phrase")
        val KEY_MOTIVATION_PHOTO = stringPreferencesKey("motivation_photo")
        val KEY_PROFILE_PHOTO = stringPreferencesKey("profile_photo")
        val KEY_NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    val authToken: Flow<String?> = ds.data.map { it[KEY_AUTH_TOKEN] }
    val isOnboarded: Flow<Boolean> = ds.data.map { it[KEY_IS_ONBOARDED] ?: false }
    val theme: Flow<String> = ds.data.map { it[KEY_THEME] ?: AppTheme.VERDE_NEGRO.key }
    val notificationsEnabled: Flow<Boolean> = ds.data.map { it[KEY_NOTIFICATIONS_ENABLED] ?: false }
    val motivationPhrase: Flow<String> = ds.data.map { it[KEY_MOTIVATION_PHRASE] ?: "Cada serie te acerca más a tu meta. ¡No pares!" }
    val motivationPhoto: Flow<String?> = ds.data.map { it[KEY_MOTIVATION_PHOTO] }
    val profilePhoto: Flow<String?> = ds.data.map { it[KEY_PROFILE_PHOTO] }

    suspend fun saveAuthToken(token: String?) {
        ds.edit { if (token != null) it[KEY_AUTH_TOKEN] = token else it.remove(KEY_AUTH_TOKEN) }
    }

    suspend fun saveUser(user: User?) {
        ds.edit {
            if (user != null) {
                it[KEY_USER_ID] = user.id
                it[KEY_USER_EMAIL] = user.email
                if (user.name != null) it[KEY_USER_NAME] = user.name else it.remove(KEY_USER_NAME)
            } else {
                it.remove(KEY_USER_ID)
                it.remove(KEY_USER_EMAIL)
                it.remove(KEY_USER_NAME)
            }
        }
    }

    fun getUser(): Flow<User?> = ds.data.map {
        val id = it[KEY_USER_ID] ?: return@map null
        val email = it[KEY_USER_EMAIL] ?: return@map null
        User(id = id, email = email, name = it[KEY_USER_NAME])
    }

    suspend fun setOnboarded(v: Boolean) = ds.edit { it[KEY_IS_ONBOARDED] = v }
    suspend fun setTheme(theme: String) = ds.edit { it[KEY_THEME] = theme }
    suspend fun setNotificationsEnabled(v: Boolean) = ds.edit { it[KEY_NOTIFICATIONS_ENABLED] = v }
    suspend fun setMotivationPhrase(phrase: String) = ds.edit { it[KEY_MOTIVATION_PHRASE] = phrase }
    suspend fun setMotivationPhoto(url: String?) = ds.edit {
        if (url != null) it[KEY_MOTIVATION_PHOTO] = url else it.remove(KEY_MOTIVATION_PHOTO)
    }
    suspend fun setProfilePhoto(url: String?) = ds.edit {
        if (url != null) it[KEY_PROFILE_PHOTO] = url else it.remove(KEY_PROFILE_PHOTO)
    }

    // ── JSON-serialized complex objects ───────────────────────────────────────

    suspend fun saveProfile(profile: UserProfile?) {
        ds.edit {
            if (profile != null) {
                it[KEY_PROFILE_JSON] = moshi.adapter(UserProfile::class.java).toJson(profile)
            } else it.remove(KEY_PROFILE_JSON)
        }
    }

    fun getProfile(): Flow<UserProfile?> = ds.data.map {
        val json = it[KEY_PROFILE_JSON] ?: return@map null
        runCatching { moshi.adapter(UserProfile::class.java).fromJson(json) }.getOrNull()
    }

    suspend fun saveRoutine(routine: List<WorkoutDay>) {
        val type = Types.newParameterizedType(List::class.java, WorkoutDay::class.java)
        ds.edit { it[KEY_ROUTINE_JSON] = moshi.adapter<List<WorkoutDay>>(type).toJson(routine) }
    }

    fun getRoutine(): Flow<List<WorkoutDay>> = ds.data.map {
        val json = it[KEY_ROUTINE_JSON] ?: return@map emptyList()
        val type = Types.newParameterizedType(List::class.java, WorkoutDay::class.java)
        runCatching { moshi.adapter<List<WorkoutDay>>(type).fromJson(json) ?: emptyList() }.getOrElse { emptyList() }
    }

    suspend fun saveDiet(diet: DietPlan?) {
        ds.edit {
            if (diet != null) it[KEY_DIET_JSON] = moshi.adapter(DietPlan::class.java).toJson(diet)
            else it.remove(KEY_DIET_JSON)
        }
    }

    fun getDiet(): Flow<DietPlan?> = ds.data.map {
        val json = it[KEY_DIET_JSON] ?: return@map null
        runCatching { moshi.adapter(DietPlan::class.java).fromJson(json) }.getOrNull()
    }

    suspend fun saveInsights(insights: Insights?) {
        ds.edit {
            if (insights != null) it[KEY_INSIGHTS_JSON] = moshi.adapter(Insights::class.java).toJson(insights)
            else it.remove(KEY_INSIGHTS_JSON)
        }
    }

    fun getInsights(): Flow<Insights?> = ds.data.map {
        val json = it[KEY_INSIGHTS_JSON] ?: return@map null
        runCatching { moshi.adapter(Insights::class.java).fromJson(json) }.getOrNull()
    }

    suspend fun saveAchievements(items: List<Achievement>) {
        val type = Types.newParameterizedType(List::class.java, Achievement::class.java)
        ds.edit { it[KEY_ACHIEVEMENTS_JSON] = moshi.adapter<List<Achievement>>(type).toJson(items) }
    }

    fun getAchievements(): Flow<List<Achievement>> = ds.data.map {
        val json = it[KEY_ACHIEVEMENTS_JSON] ?: return@map emptyList()
        val type = Types.newParameterizedType(List::class.java, Achievement::class.java)
        runCatching { moshi.adapter<List<Achievement>>(type).fromJson(json) ?: emptyList() }.getOrElse { emptyList() }
    }

    suspend fun saveMealEatenRecord(record: Map<String, List<String>>) {
        val type = Types.newParameterizedType(Map::class.java, String::class.java,
            Types.newParameterizedType(List::class.java, String::class.java))
        ds.edit { it[KEY_MEAL_EATEN_JSON] = moshi.adapter<Map<String, List<String>>>(type).toJson(record) }
    }

    fun getMealEatenRecord(): Flow<Map<String, List<String>>> = ds.data.map {
        val json = it[KEY_MEAL_EATEN_JSON] ?: return@map emptyMap()
        val type = Types.newParameterizedType(Map::class.java, String::class.java,
            Types.newParameterizedType(List::class.java, String::class.java))
        runCatching { moshi.adapter<Map<String, List<String>>>(type).fromJson(json) ?: emptyMap() }.getOrElse { emptyMap() }
    }

    suspend fun clearAll() {
        ds.edit { it.clear() }
    }
}
