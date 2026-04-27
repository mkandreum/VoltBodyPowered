# Add project specific ProGuard rules here.

# Moshi
-keep class com.squareup.moshi.** { *; }
-keepclassmembers class ** {
    @com.squareup.moshi.FromJson *;
    @com.squareup.moshi.ToJson *;
}
-keep @com.squareup.moshi.JsonClass class * { *; }

# Retrofit
-keep interface com.voltbody.app.data.remote.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Kotlin Coroutines
-keepclassmembernames class kotlinx.** { volatile <fields>; }

# Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keepclasseswithmembers class * {
    @dagger.hilt.* <fields>;
    @dagger.hilt.* <methods>;
}

# Room
-keep class androidx.room.** { *; }

# App models (Room entities + API models)
-keep class com.voltbody.app.domain.model.** { *; }
-keep class com.voltbody.app.data.local.entities.** { *; }
-keep class com.voltbody.app.data.remote.dto.** { *; }
