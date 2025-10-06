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
import com.yourcompany.field.MainActivity
import com.yourcompany.field.R
import okhttp3.MediaType.Companion.toMediaType

class FullScreenNotificationOverlay(private val context: Context) {
    
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isShowing = false
    
    companion object {
        private const val OVERLAY_TAG = "FullScreenNotificationOverlay"
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
        workDescription: String? = null,
        bookingTime: String? = null,
        bookingId: String? = null
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
                createOverlayView(title, body, iconRes, customerName, customerMobile, workAddress, workDescription, bookingTime, bookingId)
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
        workDescription: String?,
        bookingTime: String?,
        bookingId: String?
    ) {
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
        val workDescriptionText = overlayView?.findViewById<TextView>(R.id.booking_work_description)
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
        workDescriptionText?.text = "Description: ${workDescription ?: "N/A"}"
        bookingTimeText?.text = "Time: ${formatBookingTime(bookingTime)}"
        bookingIdText?.text = "Booking ID: ${bookingId ?: "N/A"}"
        
        // Set click listeners with immediate hide and click protection
        acceptButton?.setOnClickListener {
            // Disable buttons immediately to prevent multiple clicks
            acceptButton.isEnabled = false
            rejectButton?.isEnabled = false
            
            // Hide overlay immediately for better UX
            stopVibrationAndHide()
            
            // Handle accept in background thread
            Thread {
                handleAcceptClick(bookingId)
            }.start()
        }
        
        rejectButton?.setOnClickListener {
            // Disable buttons immediately to prevent multiple clicks
            acceptButton?.isEnabled = false
            rejectButton.isEnabled = false
            
            // Hide overlay immediately for better UX
            stopVibrationAndHide()
            
            // Handle reject in background thread
            Thread {
                handleRejectClick(bookingId)
            }.start()
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
    
    private fun handleAcceptClick(bookingId: String?) {
        try {
            android.util.Log.d("FullScreenOverlay", "🚨 Booking accepted - ID: $bookingId")
            
            // Get worker ID from SharedPreferences (assuming it's stored there)
            val sharedPrefs = context.getSharedPreferences("worker_prefs", android.content.Context.MODE_PRIVATE)
            val workerId = sharedPrefs.getString("worker_id", "13") ?: "13"
            
            // Call backend API to accept booking
            acceptBookingOnBackend(bookingId, workerId)
            
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error accepting booking: ${e.message}")
            e.printStackTrace()
        }
    }
    
    private fun handleRejectClick(bookingId: String?) {
        try {
            android.util.Log.d("FullScreenOverlay", "🚨 Booking rejected - ID: $bookingId")
            
            // Get worker ID from SharedPreferences (assuming it's stored there)
            val sharedPrefs = context.getSharedPreferences("worker_prefs", android.content.Context.MODE_PRIVATE)
            val workerId = sharedPrefs.getString("worker_id", "13") ?: "13"
            
            // Call backend API to reject booking
            rejectBookingOnBackend(bookingId, workerId)
            
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
        
        Thread {
            try {
                val url = "http://192.168.31.84:3001/api/accept-booking-alert"
                
                val json = org.json.JSONObject().apply {
                    put("booking_id", bookingId)
                    put("worker_id", workerId.toInt())
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
        
        Thread {
            try {
                val url = "http://192.168.31.84:3001/api/reject-booking-alert"
                
                val json = org.json.JSONObject().apply {
                    put("booking_id", bookingId)
                    put("worker_id", workerId.toInt())
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
    
    /**
     * Format booking time to readable format like "2025-09-27 12:30:00 am"
     */
    private fun formatBookingTime(bookingTime: String?): String {
        if (bookingTime.isNullOrEmpty()) {
            return "N/A"
        }
        
        try {
            // Parse the ISO string or any date format
            val inputFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault())
            val outputFormat = java.text.SimpleDateFormat("yyyy-MM-dd hh:mm:ss a", java.util.Locale.getDefault())
            
            val date = inputFormat.parse(bookingTime)
            return date?.let { outputFormat.format(it) } ?: bookingTime
        } catch (e: Exception) {
            // If parsing fails, try alternative formats
            try {
                val inputFormat2 = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.getDefault())
                val outputFormat = java.text.SimpleDateFormat("yyyy-MM-dd hh:mm:ss a", java.util.Locale.getDefault())
                
                val date = inputFormat2.parse(bookingTime)
                return date?.let { outputFormat.format(it) } ?: bookingTime
            } catch (e2: Exception) {
                // If all parsing fails, return the original string
                return bookingTime
            }
        }
    }
}
