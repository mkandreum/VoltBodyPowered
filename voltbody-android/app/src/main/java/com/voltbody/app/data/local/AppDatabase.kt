package com.voltbody.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.voltbody.app.data.local.dao.*
import com.voltbody.app.data.local.entities.*

@Database(
    entities = [
        WorkoutLogEntity::class,
        WeightLogEntity::class,
        RecoveryLogEntity::class,
        ProgressPhotoEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun workoutLogDao(): WorkoutLogDao
    abstract fun weightLogDao(): WeightLogDao
    abstract fun recoveryLogDao(): RecoveryLogDao
    abstract fun progressPhotoDao(): ProgressPhotoDao
}
