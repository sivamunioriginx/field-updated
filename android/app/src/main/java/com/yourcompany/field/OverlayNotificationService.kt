package com.yourcompany.field

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.yourcompany.field.MainActivity
import com.yourcompany.field.R

class OverlayNotificationService : Service() {
    
    companion object {
        private const val ACTION_SHOW_OVERLAY = "SHOW_OVERLAY"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_BODY = "body"
        private const val EXTRA_ICON = "icon"
        private const val EXTRA_CUSTOMER_NAME = "customer_name"
        private const val EXTRA_CUSTOMER_MOBILE = "customer_mobile"
        private const val EXTRA_WORK_ADDRESS = "work_address"
        private const val EXTRA_WORK_DESCRIPTION = "work_description"
        private const val EXTRA_BOOKING_TIME = "booking_time"
        private const val EXTRA_BOOKING_ID = "booking_id"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "overlay_service_channel"
        
        fun showOverlay(
            context: Context,
            title: String,
            body: String,
            iconRes: Int = android.R.drawable.ic_dialog_info,
            customerName: String? = null,
            customerMobile: String? = null,
            workAddress: String? = null,
            workDescription: String? = null,
            bookingTime: String? = null,
            bookingId: String? = null
        ) {
            val intent = Intent(context, OverlayNotificationService::class.java).apply {
                action = ACTION_SHOW_OVERLAY
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_ICON, iconRes)
                putExtra(EXTRA_CUSTOMER_NAME, customerName)
                putExtra(EXTRA_CUSTOMER_MOBILE, customerMobile)
                putExtra(EXTRA_WORK_ADDRESS, workAddress)
                putExtra(EXTRA_WORK_DESCRIPTION, workDescription)
                putExtra(EXTRA_BOOKING_TIME, bookingTime)
                putExtra(EXTRA_BOOKING_ID, bookingId)
            }
            context.startService(intent)
        }
    }
    
    private var overlay: FullScreenNotificationOverlay? = null
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW_OVERLAY -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "🚨 URGENT: New Booking Request!"
                val body = intent.getStringExtra(EXTRA_BODY) ?: "You have a new urgent booking request"
                val iconRes = intent.getIntExtra(EXTRA_ICON, R.mipmap.ic_launcher)
                val customerName = intent.getStringExtra(EXTRA_CUSTOMER_NAME)
                val customerMobile = intent.getStringExtra(EXTRA_CUSTOMER_MOBILE)
                val workAddress = intent.getStringExtra(EXTRA_WORK_ADDRESS)
                val workDescription = intent.getStringExtra(EXTRA_WORK_DESCRIPTION)
                val bookingTime = intent.getStringExtra(EXTRA_BOOKING_TIME)
                val bookingId = intent.getStringExtra(EXTRA_BOOKING_ID)
                
                Log.d("OverlayService", "🚨 Showing overlay from service - Title: $title")
                Log.d("OverlayService", "🚨 Service context: ${this}")
                Log.d("OverlayService", "🚨 Has overlay permission: ${OverlayPermissionHelper.hasOverlayPermission(this)}")
                Log.d("OverlayService", "🚨 App state: ${getAppState()}")
                
                // Start as foreground service for better background support
                startForegroundService()
                
                // Add small delay to ensure service is properly started
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    try {
                        Log.d("OverlayService", "🚨 Creating overlay on main thread...")
                        overlay = FullScreenNotificationOverlay(this)
                        overlay?.show(
                            title, body, iconRes, customerName, customerMobile, 
                            workAddress, workDescription, bookingTime, bookingId
                        )
                        Log.d("OverlayService", "🚨 Overlay creation completed")
                        
                        // Keep service running until user accepts/rejects
                        // No auto-stop - notification will persist until action taken
                        
                    } catch (e: Exception) {
                        Log.e("OverlayService", "❌ Error showing overlay: ${e.message}", e)
                        stopSelf()
                    }
                }, 500) // 500ms delay for better reliability
            }
        }
        return START_STICKY // Better background support
    }
    
    private fun getAppState(): String {
        return try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val runningTasks = activityManager.getRunningTasks(1)
            if (runningTasks.isNotEmpty()) {
                val topActivity = runningTasks[0].topActivity
                if (topActivity?.packageName == packageName) "FOREGROUND" else "BACKGROUND"
            } else {
                "KILLED"
            }
        } catch (e: Exception) {
            "UNKNOWN"
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        overlay?.hide()
        overlay = null
        
        // Stop vibration when service is destroyed
        try {
            val firebaseService = MyFirebaseMessagingService()
            firebaseService.stopContinuousVibration()
            Log.d("OverlayService", "📳 Vibration stopped on service destroy")
        } catch (e: Exception) {
            Log.e("OverlayService", "❌ Error stopping vibration: ${e.message}")
        }
        
        Log.d("OverlayService", "🚨 Service destroyed")
    }
    
    private fun startForegroundService() {
        try {
            createNotificationChannel()
            
            val notificationIntent = Intent(this, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                else
                    PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            val notification = Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("🚨 Full-Screen Notification Service")
                .setContentText("Displaying urgent booking alert overlay")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                this.startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                this.startForeground(NOTIFICATION_ID, notification)
            }
            Log.d("OverlayService", "🚨 Started as foreground service")
            
        } catch (e: Exception) {
            Log.e("OverlayService", "❌ Error starting foreground service: ${e.message}", e)
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Overlay Service Channel",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Channel for overlay notification service"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    /**
     * Method to stop vibration when user accepts/rejects
     */
    fun stopVibrationAndService() {
        try {
            val firebaseService = MyFirebaseMessagingService()
            firebaseService.stopContinuousVibration()
            Log.d("OverlayService", "📳 Vibration stopped by user action")
        } catch (e: Exception) {
            Log.e("OverlayService", "❌ Error stopping vibration: ${e.message}")
        }
        stopSelf()
    }
}
