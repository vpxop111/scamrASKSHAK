package com.awesomeproject

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class PersistentBackgroundService : Service() {
    private val serviceScope = CoroutineScope(Dispatchers.Default)
    private var isRunning = false

    companion object {
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "PersistentBackgroundService"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d("BGService", "Service created")
    }

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
                val reactContext = waitForReactContext()
                if (reactContext != null) {
                    performBackgroundTask(reactContext)
                } else {
                    Log.e("BGService", "Failed to get ReactContext, will retry in the next iteration")
                }
                delay(60000) // Wait for 1 minute
            }
        }
    }

    private suspend fun waitForReactContext(): ReactContext? = withContext(Dispatchers.Default) {
        var attempts = 0
        while (isRunning) { // Keep trying as long as the service is running
            val reactContext = (application as? ReactApplication)?.reactNativeHost?.reactInstanceManager?.currentReactContext
            if (reactContext != null) {
                Log.d("BGService", "ReactContext obtained after $attempts attempts")
                return@withContext reactContext
            }
            if (attempts % 10 == 0) { // Log every 10 attempts
                Log.d("BGService", "Waiting for ReactContext, attempt: $attempts")
            }
            delay(1000) // Wait for 1 second before trying again
            attempts++
        }
        return@withContext null
    }

    private fun performBackgroundTask(reactContext: ReactContext) {
        try {
            Log.d("BGService", "Performing background task with ReactContext")
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("backgroundTaskTriggered", null)
            Log.d("BGService", "Background task event emitted successfully")
        } catch (e: Exception) {
            Log.e("BGService", "Error performing background task: ${e.message}")
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
