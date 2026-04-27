package com.voltbody.app.data.local.dao

import androidx.room.*
import com.voltbody.app.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface WorkoutLogDao {
    @Query("SELECT * FROM workout_logs ORDER BY date DESC")
    fun getAllFlow(): Flow<List<WorkoutLogEntity>>

    @Query("SELECT * FROM workout_logs ORDER BY date DESC")
    suspend fun getAll(): List<WorkoutLogEntity>

    @Query("SELECT * FROM workout_logs WHERE synced = 0")
    suspend fun getUnsynced(): List<WorkoutLogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: WorkoutLogEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(logs: List<WorkoutLogEntity>)

    @Update
    suspend fun update(log: WorkoutLogEntity)

    @Query("UPDATE workout_logs SET synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM workout_logs")
    suspend fun deleteAll()
}

@Dao
interface WeightLogDao {
    @Query("SELECT * FROM weight_logs ORDER BY date ASC")
    fun getAllFlow(): Flow<List<WeightLogEntity>>

    @Query("SELECT * FROM weight_logs ORDER BY date ASC")
    suspend fun getAll(): List<WeightLogEntity>

    @Query("SELECT * FROM weight_logs WHERE synced = 0")
    suspend fun getUnsynced(): List<WeightLogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: WeightLogEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(logs: List<WeightLogEntity>)

    @Query("UPDATE weight_logs SET synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM weight_logs")
    suspend fun deleteAll()
}

@Dao
interface RecoveryLogDao {
    @Query("SELECT * FROM recovery_logs ORDER BY date ASC")
    fun getAllFlow(): Flow<List<RecoveryLogEntity>>

    @Query("SELECT * FROM recovery_logs ORDER BY date DESC LIMIT 7")
    suspend fun getLast7(): List<RecoveryLogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: RecoveryLogEntity)

    @Query("DELETE FROM recovery_logs")
    suspend fun deleteAll()
}

@Dao
interface ProgressPhotoDao {
    @Query("SELECT * FROM progress_photos ORDER BY date ASC")
    fun getAllFlow(): Flow<List<ProgressPhotoEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(photo: ProgressPhotoEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(photos: List<ProgressPhotoEntity>)

    @Query("DELETE FROM progress_photos")
    suspend fun deleteAll()
}
