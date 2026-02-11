package com.yourcompany.field

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import com.yourcompany.field.BuildConfig
import com.yourcompany.field.MainActivity
import com.yourcompany.field.R
import okhttp3.MediaType.Companion.toMediaType

class FullScreenNotificationOverlay(private val context: Context) {
    
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isShowing = false
    private var currentBookingId: String? = null
    
    companion object {
        private const val OVERLAY_TAG = "FullScreenNotificationOverlay"
        // NOTE: Keep DEV_API_BASE_URL in sync with BASE_URL in constants/api.ts
        // Extract base URL from constants/api.ts: getBaseUrl() return value without /api suffix, then add /api
        private const val DEV_API_BASE_URL = "http://192.168.31.84:3001/api"
        private const val PROD_API_BASE_URL = "https://lois-nonenvironmental-alisa.ngrok-free.dev/api"

        private fun getApiBaseUrl(): String {
            return if (BuildConfig.DEBUG) DEV_API_BASE_URL else PROD_API_BASE_URL
        }
    }
    
    init {
        windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }
    
    /**
     * Show full-screen notification overlay
     */
    fun show(
        title: String,
        body: String,
        iconRes: Int = R.mipmap.ic_launcher,
        customerName: String? = null,
        customerMobile: String? = null,
        workAddress: String? = null,
        workLocationDistance: String? = null,
        workOriginalDistance: String? = null,
        workDescription: String? = null,
        bookingTime: String? = null,
        bookingId: String? = null,
        workerId: String? = null
    ) {
        if (isShowing) {
            hide()
        }
        
        // Check if app is in foreground
        val isAppInForeground = isAppInForeground()
        android.util.Log.d("FullScreenOverlay", "🚨 App in foreground: $isAppInForeground")
        
        // Ensure UI operations run on main thread
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            try {
                createOverlayView(
                    title,
                    body,
                    iconRes,
                    customerName,
                    customerMobile,
                    workAddress,
                    workLocationDistance,
                    workOriginalDistance,
                    workDescription,
                    bookingTime,
                    bookingId,
                    workerId
                )
                addOverlayToWindow()
                isShowing = true
                android.util.Log.d("FullScreenOverlay", "🚨 Overlay shown successfully")
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error showing overlay: ${e.message}", e)
                e.printStackTrace()
            }
        }
    }
    
    /**
     * Check if the app is currently in the foreground
     */
    private fun isAppInForeground(): Boolean {
        return try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val runningTasks = activityManager.getRunningTasks(1)
            if (runningTasks.isNotEmpty()) {
                val topActivity = runningTasks[0].topActivity
                topActivity?.packageName == context.packageName
            } else {
                false
            }
        } catch (e: Exception) {
            android.util.Log.w("FullScreenOverlay", "⚠️ Could not check app state: ${e.message}")
            false
        }
    }
    
    /**
     * Hide the overlay immediately
     */
    fun hide() {
        try {
            overlayView?.let { view ->
                windowManager?.removeView(view)
                android.util.Log.d("FullScreenOverlay", "🚨 Overlay removed from window")
            }
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error removing overlay from window: ${e.message}")
        } finally {
            overlayView = null
            isShowing = false
            MyFirebaseMessagingService.clearActiveOverlayBooking(currentBookingId)
            currentBookingId = null
            android.util.Log.d("FullScreenOverlay", "🚨 Overlay hidden successfully")
        }
    }
    
    /**
     * Check if overlay is currently showing
     */
    fun isOverlayShowing(): Boolean = isShowing
    
    private fun createOverlayView(
        title: String,
        body: String,
        iconRes: Int,
        customerName: String?,
        customerMobile: String?,
        workAddress: String?,
        workLocationDistance: String?,
        workOriginalDistance: String?,
        workDescription: String?,
        bookingTime: String?,
        bookingId: String?,
        workerId: String?
    ) {
        currentBookingId = bookingId
        val inflater = LayoutInflater.from(context)
        overlayView = inflater.inflate(R.layout.overlay_fullscreen_notification, null)
        
        // Initialize views
        val titleText = overlayView?.findViewById<TextView>(R.id.overlay_title)
        val bodyText = overlayView?.findViewById<TextView>(R.id.overlay_body)
        val iconImage = overlayView?.findViewById<ImageView>(R.id.overlay_icon)
        val acceptButton = overlayView?.findViewById<Button>(R.id.btn_accept)
        val rejectButton = overlayView?.findViewById<Button>(R.id.btn_reject)
        
        // Initialize booking data views
        val customerNameText = overlayView?.findViewById<TextView>(R.id.booking_customer_name)
        val customerMobileText = overlayView?.findViewById<TextView>(R.id.booking_customer_mobile)
        val workAddressText = overlayView?.findViewById<TextView>(R.id.booking_work_address)
        val workDistanceText = overlayView?.findViewById<TextView>(R.id.booking_work_distance)
        val workDescriptionText = overlayView?.findViewById<TextView>(R.id.booking_work_description)
        val workOriginalDistanceText = overlayView?.findViewById<TextView>(R.id.booking_work_original_distance)
        val bookingTimeText = overlayView?.findViewById<TextView>(R.id.booking_time)
        val bookingIdText = overlayView?.findViewById<TextView>(R.id.booking_id)
        
        // Set content
        titleText?.text = title
        bodyText?.text = body
        iconImage?.setImageResource(iconRes)
        
        // Set booking data
        customerNameText?.text = "Customer: ${customerName ?: "N/A"}"
        customerMobileText?.text = "Mobile: ${customerMobile ?: "N/A"}"
        workAddressText?.text = "Location: ${workAddress ?: "N/A"}"
        
        // Set distance with visibility control
        if (!workLocationDistance.isNullOrEmpty()) {
            workDistanceText?.text = "Distance From Your Current Location: $workLocationDistance"
            workDistanceText?.visibility = android.view.View.VISIBLE
        } else {
            workDistanceText?.visibility = android.view.View.GONE
        }

        if (!workOriginalDistance.isNullOrEmpty()) {
            workOriginalDistanceText?.text = "Distance From Your Original Location: $workOriginalDistance"
            workOriginalDistanceText?.visibility = android.view.View.VISIBLE
        } else {
            workOriginalDistanceText?.visibility = android.view.View.GONE
        }
        
        workDescriptionText?.text = "Description: ${workDescription ?: "N/A"}"
        bookingTimeText?.text = "Booking For: ${formatBookingTime(bookingTime)}"
        bookingIdText?.text = "Booking ID: ${bookingId ?: "N/A"}"
        
        // Set click listeners with immediate hide and click protection
        acceptButton?.setOnClickListener {
            // Disable buttons immediately to prevent multiple clicks
            acceptButton.isEnabled = false
            rejectButton?.isEnabled = false
            MyFirebaseMessagingService.markBookingHandled(bookingId)
            
            // Hide overlay immediately for better UX
            stopVibrationAndHide()
            
            // Handle accept in background thread
            Thread { handleAcceptClick(bookingId, workerId) }.start()
        }
        
        rejectButton?.setOnClickListener {
            // Disable buttons immediately to prevent multiple clicks
            acceptButton?.isEnabled = false
            rejectButton.isEnabled = false
            MyFirebaseMessagingService.markBookingHandled(bookingId)
            
            // Hide overlay immediately for better UX
            stopVibrationAndHide()
            
            // Handle reject in background thread
            Thread { handleRejectClick(bookingId, workerId) }.start()
        }
        
        // Remove auto-dismiss - notification persists until user action
    }
    
    private fun addOverlayToWindow() {
        try {
            val layoutParams = createLayoutParams()
            overlayView?.let { view ->
                windowManager?.addView(view, layoutParams)
                android.util.Log.d("FullScreenOverlay", "🚨 Overlay added to window successfully")
            }
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error adding overlay to window: ${e.message}", e)
            throw e
        }
    }
    
    private fun createLayoutParams(): WindowManager.LayoutParams {
        val layoutParams = WindowManager.LayoutParams()
        
        // Set window type based on Android version
        layoutParams.type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        
        // Set flags for overlay behavior - optimized for background/killed state
        layoutParams.flags = (
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
            WindowManager.LayoutParams.FLAG_IGNORE_CHEEK_PRESSES or
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        
        // Set size and position
        layoutParams.width = WindowManager.LayoutParams.MATCH_PARENT
        layoutParams.height = WindowManager.LayoutParams.MATCH_PARENT
        layoutParams.gravity = Gravity.CENTER
        
        // Set format
        layoutParams.format = PixelFormat.TRANSLUCENT
        
        return layoutParams
    }
    
    private fun handleAcceptClick(bookingId: String?, workerId: String?) {
        try {
            android.util.Log.d("FullScreenOverlay", "🚨 Booking accepted - ID: $bookingId")
            
            val resolvedWorkerId = resolveWorkerId(workerId)
            if (resolvedWorkerId == null) {
                android.util.Log.e("FullScreenOverlay", "❌ Worker ID missing - cannot accept booking")
                return
            }
            
            // Call backend API to accept booking
            acceptBookingOnBackend(bookingId, resolvedWorkerId)
            
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error accepting booking: ${e.message}")
            e.printStackTrace()
        }
    }
    
    private fun handleRejectClick(bookingId: String?, workerId: String?) {
        try {
            android.util.Log.d("FullScreenOverlay", "🚨 Booking rejected - ID: $bookingId")
            
            val resolvedWorkerId = resolveWorkerId(workerId)
            if (resolvedWorkerId == null) {
                android.util.Log.e("FullScreenOverlay", "❌ Worker ID missing - cannot reject booking")
                return
            }
            
            // Call backend API to reject booking
            rejectBookingOnBackend(bookingId, resolvedWorkerId)
            
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error rejecting booking: ${e.message}")
            e.printStackTrace()
        }
    }
    
    /**
     * Stop vibration and hide overlay when user takes action
     */
    private fun stopVibrationAndHide() {
        // Hide overlay immediately for better UX
        hide()
        MyFirebaseMessagingService.clearActiveOverlayBooking(currentBookingId)
        
        // Cleanup operations in background thread to avoid blocking UI
        Thread {
            try {
                // Stop vibration
                val firebaseService = MyFirebaseMessagingService()
                firebaseService.stopContinuousVibration()
                android.util.Log.d("FullScreenOverlay", "📳 Vibration stopped by user action")
                
                // Stop overlay service
                if (context is OverlayNotificationService) {
                    context.stopVibrationAndService()
                }
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error stopping vibration: ${e.message}")
            }
        }.start()
    }
    
    /**
     * Call backend API to accept booking
     */
    private fun acceptBookingOnBackend(bookingId: String?, workerId: String) {
        if (bookingId == null) {
            android.util.Log.e("FullScreenOverlay", "❌ Booking ID is null")
            return
        }
        
        val workerIdInt = workerId.toIntOrNull()
        if (workerIdInt == null) {
            android.util.Log.e("FullScreenOverlay", "❌ Worker ID is invalid: $workerId")
            return
        }
        
        Thread {
            try {
                val url = "${getApiBaseUrl()}/accept-booking-alert"
                
                val json = org.json.JSONObject().apply {
                    put("booking_id", bookingId)
                    put("worker_id", workerIdInt)
                    put("action", "accept")
                }
                
                val client = okhttp3.OkHttpClient()
                val requestBody = okhttp3.RequestBody.create(
                    "application/json".toMediaType(),
                    json.toString()
                )
                
                val request = okhttp3.Request.Builder()
                    .url(url)
                    .post(requestBody)
                    .addHeader("Content-Type", "application/json")
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()
                
                android.util.Log.d("FullScreenOverlay", "✅ Accept API response: $responseBody")
                
                // API call completed successfully - overlay already hidden
                
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error calling accept API: ${e.message}")
                // API call failed but overlay already hidden
            }
        }.start()
    }
    
    /**
     * Call backend API to reject booking
     */
    private fun rejectBookingOnBackend(bookingId: String?, workerId: String) {
        if (bookingId == null) {
            android.util.Log.e("FullScreenOverlay", "❌ Booking ID is null")
            return
        }
        
        val workerIdInt = workerId.toIntOrNull()
        if (workerIdInt == null) {
            android.util.Log.e("FullScreenOverlay", "❌ Worker ID is invalid: $workerId")
            return
        }
        
        Thread {
            try {
                val url = "${getApiBaseUrl()}/reject-booking-alert"
                
                val json = org.json.JSONObject().apply {
                    put("booking_id", bookingId)
                    put("worker_id", workerIdInt)
                    put("reason", "Booking Failed")
                }
                
                val client = okhttp3.OkHttpClient()
                val requestBody = okhttp3.RequestBody.create(
                    "application/json".toMediaType(),
                    json.toString()
                )
                
                val request = okhttp3.Request.Builder()
                    .url(url)
                    .post(requestBody)
                    .addHeader("Content-Type", "application/json")
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()
                
                android.util.Log.d("FullScreenOverlay", "✅ Reject API response: $responseBody")
                
                // API call completed successfully - overlay already hidden
                
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error calling reject API: ${e.message}")
                // API call failed but overlay already hidden
            }
        }.start()
    }
    
    private fun resolveWorkerId(passedWorkerId: String?): String? {
        if (!passedWorkerId.isNullOrBlank()) {
            return passedWorkerId
        }
        
        val storedWorkerId = getStoredWorkerId()
        if (storedWorkerId.isNullOrBlank()) {
            android.util.Log.e("FullScreenOverlay", "❌ Worker ID unavailable in notification data and storage")
        } else {
            android.util.Log.d("FullScreenOverlay", "ℹ️ Using worker ID from storage: $storedWorkerId")
        }
        return storedWorkerId
    }
    
    private fun getStoredWorkerId(): String? {
        return try {
            val sharedPrefs = context.getSharedPreferences("worker_prefs", android.content.Context.MODE_PRIVATE)
            sharedPrefs.getString("worker_id", null)
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error reading worker ID from storage: ${e.message}")
            null
        }
    }
    
    /**
     * Format booking time to readable format like "2025-09-27 12:30:00 PM"
     */
    private fun formatBookingTime(bookingTime: String?): String {
        if (bookingTime.isNullOrEmpty()) {
            return "N/A"
        }

        val outputFormat = java.text.SimpleDateFormat("yyyy-MM-dd hh:mm:ss a", java.util.Locale.getDefault())
        val possibleFormats = listOf(
            "yyyy-MM-dd HH:mm:ss",                // Backend format (e.g., 2025-11-28 13:30:00)
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",      // ISO with millis
            "yyyy-MM-dd'T'HH:mm:ss'Z'",          // ISO without millis
            "yyyy-MM-dd'T'HH:mm:ss.SSS",         // ISO with millis, no Z
            "yyyy-MM-dd'T'HH:mm:ss"               // ISO without millis, no Z
        )

        for (pattern in possibleFormats) {
            try {
                val inputFormat = java.text.SimpleDateFormat(pattern, java.util.Locale.getDefault())
                // Set timezone to UTC for ISO formats, or use system default for non-ISO formats
                if (pattern.contains("'Z'")) {
                    inputFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
                } else {
                    // For non-ISO formats like "yyyy-MM-dd HH:mm:ss", use system timezone
                    // This ensures 13:30:00 stays as 13:30:00 (1:30 PM) without timezone conversion
                    inputFormat.timeZone = java.util.TimeZone.getDefault()
                }
                
                val date = inputFormat.parse(bookingTime)
                if (date != null) {
                    // Use system timezone for output to ensure correct local time display
                    outputFormat.timeZone = java.util.TimeZone.getDefault()
                    return outputFormat.format(date)
                }
            } catch (e: Exception) {
                android.util.Log.d("FullScreenOverlay", "⚠️ Failed to parse time with pattern $pattern: ${e.message}")
                // Try next pattern
            }
        }

        // Fallback to original string if nothing matched
        android.util.Log.w("FullScreenOverlay", "⚠️ Could not parse booking time: $bookingTime")
        return bookingTime
    }
}
