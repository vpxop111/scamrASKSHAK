package com.awesomeproject

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

class PersistentBackgroundService : Service() {
    private val serviceScope = CoroutineScope(Dispatchers.Default)
    private var isRunning = false

    companion object {
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "PersistentBackgroundService"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("BGService", "Service started")
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        
        if (!isRunning) {
            isRunning = true
            runBackgroundTask()
        }

        return START_STICKY
    }

    private fun runBackgroundTask() {
        serviceScope.launch {
            while (isRunning) {
                Log.d("BGService", "Background task running")
                // Perform your background tasks here
                delay(60000) // Wait for 1 minute
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        serviceScope.cancel()
        Log.d("BGService", "Service destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Persistent Background Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Background Service")
            .setContentText("Running in background")
            .setSmallIcon(com.awesomeproject.R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
