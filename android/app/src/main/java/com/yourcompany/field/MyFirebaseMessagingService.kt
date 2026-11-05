package com.yourcompany.field

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.google.gson.Gson
import org.json.JSONObject
import java.util.Collections
import java.util.Random

class MyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "MyFirebaseMessaging"
        private const val CHANNEL_ID = "booking-alerts"
        private var isVibrating = false
        private var vibrator: Vibrator? = null
        private val handledBookingIds = Collections.synchronizedSet(mutableSetOf<String>())
        private var activeOverlayBookingId: String? = null

        fun markBookingHandled(bookingId: String?) {
            bookingId?.let { handledBookingIds.add(it) }
        }

        fun isBookingHandled(bookingId: String?): Boolean {
            return bookingId != null && handledBookingIds.contains(bookingId)
        }

        fun setActiveOverlayBooking(bookingId: String?) {
            bookingId?.let { activeOverlayBookingId = it }
        }

        fun clearActiveOverlayBooking(bookingId: String?) {
            if (bookingId != null && activeOverlayBookingId == bookingId) {
                activeOverlayBookingId = null
            }
        }

        fun isOverlayBookingActive(bookingId: String?): Boolean {
            return bookingId != null && activeOverlayBookingId == bookingId
        }

        /**
         * Start repeating vibration until popup is dismissed.
         * Must be started from OverlayNotificationService (long-lived), not only FCM.
         */
        fun startOverlayVibration(context: Context) {
            try {
                // Always (re)start — FCM may have started briefly then died after 1–2s
                vibrator?.cancel()
                isVibrating = true
                vibrator = context.applicationContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator

                // Vibrate 1s, pause 0.5s — repeat until stopOverlayVibration()
                val pattern = longArrayOf(0, 1000, 500)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val vibrationEffect = VibrationEffect.createWaveform(pattern, 0)
                    vibrator?.vibrate(vibrationEffect)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, 0)
                }
                Log.d(TAG, "📳 Overlay vibration started (until popup dismissed)")
            } catch (e: Exception) {
                isVibrating = false
                Log.e(TAG, "❌ Error starting overlay vibration: ${e.message}")
            }
        }

        fun stopOverlayVibration() {
            try {
                if (isVibrating) {
                    vibrator?.cancel()
                    isVibrating = false
                    Log.d(TAG, "📳 Overlay vibration stopped")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error stopping overlay vibration: ${e.message}")
            }
        }
    }

    // Override to prevent default notification display and handle it ourselves
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val notification = remoteMessage.notification
        
        Log.d(TAG, "🚨 onMessageReceived called - Data: $data, Notification: $notification")
        Log.d(TAG, "🚨 App in foreground: ${isAppInForeground()}")
        Log.d(TAG, "🚨 Message ID: ${remoteMessage.messageId}")
        Log.d(TAG, "🚨 From: ${remoteMessage.from}")
        Log.d(TAG, "🚨 TTL: ${remoteMessage.ttl}")
        
        // Check if this is a full-screen notification request
        val isFullScreen = data["fullscreen"]?.toBoolean() ?: false
        Log.d(TAG, "🚨 Is fullscreen requested: $isFullScreen")
        
        if (isFullScreen) {
            Log.d(TAG, "🚨 Full-screen notification detected, processing...")
            // Process the message ourselves instead of letting Firebase handle it
            processMessage(data, notification)
        } else {
            Log.d(TAG, "🚨 Regular notification, letting Firebase handle it")
            // Let Firebase handle regular notifications
            super.onMessageReceived(remoteMessage)
        }
    }
    
    // This method is called when the app is in background and Firebase shows notification automatically
    override fun handleIntent(intent: Intent?) {
        Log.d(TAG, "🚨 handleIntent called - Intent: $intent")
        
        // Extract data from intent extras - CRITICAL FIX for background/killed state
        val data = mutableMapOf<String, String>()
        intent?.extras?.let { extras ->
            for (key in extras.keySet()) {
                val value = extras.get(key)?.toString()
                if (value != null) {
                    data[key] = value
                    Log.d(TAG, "🚨 Intent extra - $key: $value")
                }
            }
        }
        
        // Also check for Firebase-specific data keys
        intent?.extras?.let { extras ->
            // Check for Firebase data payload
            val firebaseData = extras.getBundle("gcm.notification.data")
            firebaseData?.let { bundle ->
                for (key in bundle.keySet()) {
                    val value = bundle.get(key)?.toString()
                    if (value != null) {
                        data[key] = value
                        Log.d(TAG, "🚨 Firebase data - $key: $value")
                    }
                }
            }
            
            // Check for direct Firebase message data
            val messageData = extras.getBundle("data")
            messageData?.let { bundle ->
                for (key in bundle.keySet()) {
                    val value = bundle.get(key)?.toString()
                    if (value != null) {
                        data[key] = value
                        Log.d(TAG, "🚨 Message data - $key: $value")
                    }
                }
            }
        }
        
        Log.d(TAG, "🚨 Final extracted data from intent: $data")
        
        // Process the message even when app is in background/killed
        if (data.isNotEmpty()) {
            Log.d(TAG, "🚨 Processing background message with ${data.size} data fields")
            processMessage(data, null)
        } else {
            Log.w(TAG, "⚠️ No data found in intent extras")
        }
        
        // Call super AFTER processing to avoid default notification
        super.handleIntent(intent)
    }
    
    private fun processMessage(data: Map<String, String>, notification: RemoteMessage.Notification?) {
        try {
            Log.d(TAG, "🚨 Processing message - Data: $data")
            Log.d(TAG, "🚨 Processing notification - Data: $notification")

            // Extract title and body from notification or data
            val title = notification?.title 
                ?: data["gcm.notification.title"] 
                ?: data["notification_title"] 
                ?: data["title"] 
                ?: "🚨 URGENT: New Booking Request!"
            val body = notification?.body 
                ?: data["gcm.notification.body"] 
                ?: data["notification_body"] 
                ?: data["body"] 
                ?: "You have a new urgent booking request"
            val badge = data["badge"] ?: "1"
            val isFullScreen = data["fullscreen"]?.toBoolean() ?: false
            
            // Extract booking data
            val customerName = data["customer_name"] ?: data["customerName"]
            val customerMobile = data["customer_mobile"] ?: data["customerMobile"]
            val workAddress = data["work_location"] ?: data["workAddress"]
            val workLocationDistance = data["work_location_distance"] ?: ""
            val workDescription = data["description"] ?: data["workDescription"]
            val bookingTime = data["booking_time"] ?: data["bookingTime"]
            val bookingId = data["booking_id"] ?: data["bookingId"]
            val workerId = data["worker_id"] ?: data["workerId"]
            val workOriginalDistance = data["work_location_distance_original"] ?: ""
            val workerLat = data["worker_lat"] ?: data["workerLat"]
            val workerLng = data["worker_lng"] ?: data["workerLng"]
            val workLat = data["work_location_lat"] ?: data["work_lat"] ?: data["workLat"]
            val workLng = data["work_location_lng"] ?: data["work_lng"] ?: data["workLng"]
            
            if (isBookingHandled(bookingId)) {
                Log.d(TAG, "🚨 Booking $bookingId already handled locally, skipping overlay.")
                return
            }

            if (isOverlayBookingActive(bookingId)) {
                Log.d(TAG, "🚨 Booking $bookingId already displayed, ignoring duplicate notification.")
                return
            }
            
            Log.d(TAG, "🚨 Processing message - Title: $title, Body: $body, FullScreen: $isFullScreen")
            Log.d(TAG, "🚨 Booking data - Customer: $customerName, Location: $workAddress, Distance: $workLocationDistance")
            
            // Check if full-screen notification should be shown
            if (isFullScreen) {
                Log.d(TAG, "🚨 Full-screen notification requested")
                if (OverlayPermissionHelper.hasOverlayPermission(this)) {
                    Log.d(TAG, "🚨 Overlay permission granted, showing full-screen notification")
                    
                    // Vibration is started by OverlayNotificationService (keeps running until popup closes)
                    startContinuousVibration()
                    
                    try {
                        setActiveOverlayBooking(bookingId)
                        showFullScreenNotification(
                            title = title,
                            body = body,
                            customerName = customerName,
                            customerMobile = customerMobile,
                            workAddress = workAddress,
                            workLocationDistance = workLocationDistance,
                            workOriginalDistance = workOriginalDistance,
                            workDescription = workDescription,
                            bookingTime = bookingTime,
                            bookingId = bookingId,
                            workerId = workerId,
                            workerLat = workerLat,
                            workerLng = workerLng,
                            workLat = workLat,
                            workLng = workLng
                        )
                        Log.d(TAG, "🚨 Full-screen notification overlay displayed - Title: $title, Body: $body")
                    } catch (overlayError: Exception) {
                        clearActiveOverlayBooking(bookingId)
                        throw overlayError
                    }
                } else {
                    Log.d(TAG, "🚨 Overlay permission not granted, showing regular notification")
                    // Permission not granted, show regular notification with message
                    val regularTitle = "$title (Full-screen not available)"
                    val regularBody = "$body\n\nNote: Enable 'Display over other apps' permission for full-screen notifications"
                    
                    val intent = Intent(this, MainActivity::class.java).apply {
                        putExtra("booking_id", bookingId)
                        putExtra("customer_name", customerName)
                        putExtra("work_location", workAddress)
                        putExtra("notification_data", Gson().toJson(data))
                    }
                    
                    sendNotification(regularTitle, badge, regularBody, intent)
                    Log.d(TAG, "🚨 Regular notification sent (overlay permission not granted)")
                }
            } else {
                Log.d(TAG, "🚨 Regular notification requested")
                // Create intent with all available data for regular notification
                val intent = Intent(this, MainActivity::class.java).apply {
                    putExtra("booking_id", bookingId)
                    putExtra("customer_name", customerName)
                    putExtra("work_location", workAddress)
                    putExtra("notification_data", Gson().toJson(data))
                }

                sendNotification(title, badge, body, intent)
                Log.d(TAG, "🚨 Regular notification sent successfully")
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error processing notification: ${e.message}", e)
            
            // Fallback: Send basic notification even if parsing fails
            try {
                val fallbackIntent = Intent(this, MainActivity::class.java)
                sendNotification(
                    "🚨 URGENT: New Booking Request!",
                    "1", 
                    "You have a new urgent booking request",
                    fallbackIntent
                )
                Log.d(TAG, "🚨 Fallback notification sent")
            } catch (fallbackError: Exception) {
                Log.e(TAG, "❌ Failed to send fallback notification: ${fallbackError.message}")
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "🚨 New FCM token received: ${token.substring(0, 20)}...")
        
        // Update the FCM token in the app
        try {
            // Store token for later use
            Log.d(TAG, "🚨 FCM token updated successfully")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to update FCM token: ${e.message}")
        }
    }

    /**
     * Show full-screen notification overlay
     */
    private fun showFullScreenNotification(
        title: String,
        body: String,
        customerName: String?,
        customerMobile: String?,
        workAddress: String?,
        workLocationDistance: String?,
        workOriginalDistance: String?,
        workDescription: String?,
        bookingTime: String?,
        bookingId: String?,
        workerId: String?,
        workerLat: String? = null,
        workerLng: String? = null,
        workLat: String? = null,
        workLng: String? = null
    ) {
        try {
            Log.d(TAG, "🚨 Attempting to show full-screen notification overlay")
            
            // Use service approach for better background/killed state support
            OverlayNotificationService.showOverlay(
                context = this,
                title = title,
                body = body,
                iconRes = R.mipmap.ic_launcher,
                customerName = customerName,
                customerMobile = customerMobile,
                workAddress = workAddress,
                workLocationDistance = workLocationDistance,
                workOriginalDistance = workOriginalDistance,
                workDescription = workDescription,
                bookingTime = bookingTime,
                bookingId = bookingId,
                workerId = workerId,
                workerLat = workerLat,
                workerLng = workerLng,
                workLat = workLat,
                workLng = workLng
            )
            
            Log.d(TAG, "🚨 Full-screen notification service started")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error showing full-screen notification overlay: ${e.message}", e)
            
            // Fallback to regular notification
            try {
                val fallbackIntent = Intent(this, MainActivity::class.java).apply {
                    putExtra("booking_id", bookingId)
                    putExtra("customer_name", customerName)
                    putExtra("work_location", workAddress)
                }
                sendNotification(title, "1", body, fallbackIntent)
                Log.d(TAG, "🚨 Fallback notification sent")
            } catch (fallbackError: Exception) {
                Log.e(TAG, "❌ Failed to show fallback notification: ${fallbackError.message}")
            }
        }
    }

    /**
     * Check if the app is currently in the foreground
     */
    private fun isAppInForeground(): Boolean {
        return try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val runningTasks = activityManager.getRunningTasks(1)
            if (runningTasks.isNotEmpty()) {
                val topActivity = runningTasks[0].topActivity
                topActivity?.packageName == packageName
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Could not check app state: ${e.message}")
            false
        }
    }

    private fun sendNotification(
        title: String,
        badge: String,
        messageBody: String,
        intent: Intent
    ) {
        try {
            // Ensure title and body are not empty
            val safeTitle = title.ifEmpty { "🚨 URGENT: New Booking Request!" }
            val safeBody = messageBody.ifEmpty { "You have a new urgent booking request" }
            val safeBadge = try { badge.toInt().toString() } catch (e: Exception) { "1" }
            
            val pendingIntent = PendingIntent.getActivity(
                this, 
                Random().nextInt(10000), // Use random request code to avoid conflicts
                intent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                else
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_ONE_SHOT
            )

            val notificationBuilder =
                createNotificationBuilder(safeTitle, safeBadge, safeBody, pendingIntent)
            showNotification(notificationBuilder)
            
            Log.d(TAG, "🚨 Notification displayed successfully")
        } catch (t: Throwable) {
            Log.e(TAG, "❌ Error in sendNotification: ${t.localizedMessage}", t)
            
            // Last resort: Try to show a basic notification
            try {
                showBasicNotification(title, messageBody)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to show basic notification: ${e.message}")
            }
        }
    }

    private fun createNotificationBuilder(
        title: String,
        badge: String,
        body: String,
        pendingIntent: PendingIntent
    ): NotificationCompat.Builder {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setVibrate(longArrayOf(500, 1000))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_ALL)
            .setOngoing(true)
            .setNumber(badge.toInt())
    }

    private fun showNotification(builder: NotificationCompat.Builder) {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Booking Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            lightColor = Color.BLUE
            enableLights(true)
            enableVibration(true)
            vibrationPattern = longArrayOf(500, 1000)
            setShowBadge(true)
        }
        notificationManager.createNotificationChannel(channel)

        notificationManager.notify(Random().nextInt(1000), builder.build())
    }

    /**
     * Fallback method to show a basic notification when all else fails
     */
    private fun showBasicNotification(title: String, body: String) {
        try {
            val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            
            // Create basic notification channel
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Booking Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
            
            // Create basic intent
            val intent = Intent(this, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                this, 
                Random().nextInt(10000),
                intent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                else
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_ONE_SHOT
            )
            
            // Create basic notification
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title.ifEmpty { "🚨 URGENT: New Booking Request!" })
                .setContentText(body.ifEmpty { "You have a new urgent booking request" })
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()
            
            notificationManager.notify(Random().nextInt(1000), notification)
            Log.d(TAG, "🚨 Basic notification shown successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show basic notification: ${e.message}")
        }
    }

    /**
     * Start continuous vibration for urgent booking alerts (until popup dismissed)
     */
    private fun startContinuousVibration() {
        startOverlayVibration(this)
    }

    /**
     * Stop continuous vibration
     */
    fun stopContinuousVibration() {
        stopOverlayVibration()
    }
}
