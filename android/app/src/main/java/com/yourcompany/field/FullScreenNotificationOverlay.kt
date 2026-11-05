package com.yourcompany.field

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.MapsInitializer
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions
import com.yourcompany.field.BuildConfig
import com.yourcompany.field.R
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject

class FullScreenNotificationOverlay(private val context: Context) {
    
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isShowing = false
    private var currentBookingId: String? = null
    private var mapView: MapView? = null
    private var googleMap: GoogleMap? = null
    
    companion object {
        private const val OVERLAY_TAG = "FullScreenNotificationOverlay"
        // NOTE: Keep DEV_API_BASE_URL in sync with BASE_URL in constants/api.ts
        private const val DEV_API_BASE_URL = "http://192.168.31.84:3001/api"
        private const val PROD_API_BASE_URL = "https://lois-nonenvironmental-alisa.ngrok-free.dev/api"
        private const val GOOGLE_MAPS_API_KEY = "AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ"

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
        workerId: String? = null,
        workerLat: String? = null,
        workerLng: String? = null,
        workLat: String? = null,
        workLng: String? = null
    ) {
        if (isShowing) {
            hide()
        }
        
        val isAppInForeground = isAppInForeground()
        android.util.Log.d("FullScreenOverlay", "🚨 App in foreground: $isAppInForeground")
        
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
                    workerId,
                    workerLat,
                    workerLng,
                    workLat,
                    workLng
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
    
    fun hide() {
        try {
            teardownMap()
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
        workerId: String?,
        workerLat: String?,
        workerLng: String?,
        workLat: String?,
        workLng: String?
    ) {
        currentBookingId = bookingId
        val inflater = LayoutInflater.from(context)
        overlayView = inflater.inflate(R.layout.overlay_fullscreen_notification, null)
        
        val titleText = overlayView?.findViewById<TextView>(R.id.overlay_title)
        val bodyText = overlayView?.findViewById<TextView>(R.id.overlay_body)
        val iconImage = overlayView?.findViewById<ImageView>(R.id.overlay_icon)
        val acceptButton = overlayView?.findViewById<Button>(R.id.btn_accept)
        val rejectButton = overlayView?.findViewById<Button>(R.id.btn_reject)
        
        val customerNameText = overlayView?.findViewById<TextView>(R.id.booking_customer_name)
        val customerMobileText = overlayView?.findViewById<TextView>(R.id.booking_customer_mobile)
        val workAddressText = overlayView?.findViewById<TextView>(R.id.booking_work_address)
        val workDescriptionText = overlayView?.findViewById<TextView>(R.id.booking_work_description)
        val bookingTimeText = overlayView?.findViewById<TextView>(R.id.booking_time)
        val mapLoadingText = overlayView?.findViewById<TextView>(R.id.booking_map_loading)
        mapView = overlayView?.findViewById(R.id.booking_route_map)
        
        titleText?.text = title
        bodyText?.visibility = View.GONE
        iconImage?.setImageResource(iconRes)
        
        customerNameText?.text = "Customer: ${customerName ?: "N/A"}"
        customerMobileText?.text = "Mobile: ${customerMobile ?: "N/A"}"
        workAddressText?.text = "Location: ${workAddress ?: "N/A"}"
        workDescriptionText?.text = "Description: ${workDescription ?: "N/A"}"
        bookingTimeText?.text = "Booking For: ${formatBookingTime(bookingTime)}"
        
        setupRouteMap(workerLat, workerLng, workLat, workLng, mapLoadingText)
        
        acceptButton?.setOnClickListener {
            acceptButton.isEnabled = false
            rejectButton?.isEnabled = false
            MyFirebaseMessagingService.markBookingHandled(bookingId)
            stopVibrationAndHide()
            Thread { handleAcceptClick(bookingId, workerId) }.start()
        }
        
        rejectButton?.setOnClickListener {
            acceptButton?.isEnabled = false
            rejectButton.isEnabled = false
            MyFirebaseMessagingService.markBookingHandled(bookingId)
            stopVibrationAndHide()
            Thread { handleRejectClick(bookingId, workerId) }.start()
        }
    }

    private fun setupRouteMap(
        workerLat: String?,
        workerLng: String?,
        workLat: String?,
        workLng: String?,
        etaBadgeText: TextView?
    ) {
        val originLat = workerLat?.toDoubleOrNull()
        val originLng = workerLng?.toDoubleOrNull()
        val destLat = workLat?.toDoubleOrNull()
        val destLng = workLng?.toDoubleOrNull()

        if (originLat == null || originLng == null || destLat == null || destLng == null) {
            etaBadgeText?.text = "Map unavailable"
            android.util.Log.w(
                "FullScreenOverlay",
                "⚠️ Missing coords worker=($workerLat,$workerLng) work=($workLat,$workLng)"
            )
            return
        }

        val origin = LatLng(originLat, originLng)
        val destination = LatLng(destLat, destLng)

        try {
            MapsInitializer.initialize(context)
            mapView?.onCreate(Bundle())
            mapView?.onResume()
            mapView?.getMapAsync { map ->
                googleMap = map
                map.uiSettings.isZoomControlsEnabled = false
                map.uiSettings.isMapToolbarEnabled = false
                map.uiSettings.isMyLocationButtonEnabled = false
                map.isTrafficEnabled = true
                // Hide business/POI icons (e.g. shopping bag markers)
                try {
                    map.setMapStyle(
                        com.google.android.gms.maps.model.MapStyleOptions(
                            """[{"featureType":"poi","stylers":[{"visibility":"off"}]}]"""
                        )
                    )
                } catch (_: Exception) { }

                map.addMarker(
                    MarkerOptions()
                        .position(origin)
                        .title("You")
                        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE))
                )
                map.addMarker(
                    MarkerOptions()
                        .position(destination)
                        .title("Job location")
                        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
                )

                val bounds = LatLngBounds.builder()
                    .include(origin)
                    .include(destination)
                    .build()
                map.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds, 80))

                fetchAndDrawNearestRoute(origin, destination, map, etaBadgeText)
            }
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Map setup failed: ${e.message}", e)
            etaBadgeText?.text = "Map failed to load"
        }
    }

    private fun fetchAndDrawNearestRoute(
        origin: LatLng,
        destination: LatLng,
        map: GoogleMap,
        etaBadgeText: TextView?
    ) {
        Thread {
            try {
                val url =
                    "https://maps.googleapis.com/maps/api/directions/json" +
                        "?origin=${origin.latitude},${origin.longitude}" +
                        "&destination=${destination.latitude},${destination.longitude}" +
                        "&mode=driving" +
                        "&departure_time=now" +
                        "&traffic_model=best_guess" +
                        "&alternatives=false" +
                        "&key=$GOOGLE_MAPS_API_KEY"

                val client = okhttp3.OkHttpClient()
                val request = okhttp3.Request.Builder().url(url).get().build()
                val response = client.newCall(request).execute()
                val body = response.body?.string().orEmpty()
                val json = JSONObject(body)
                val status = json.optString("status")

                if (status != "OK") {
                    android.util.Log.e("FullScreenOverlay", "❌ Directions API status=$status body=$body")
                    android.os.Handler(android.os.Looper.getMainLooper()).post {
                        etaBadgeText?.text = "Route unavailable"
                        drawStraightFallback(map, origin, destination)
                    }
                    return@Thread
                }

                val route = json.getJSONArray("routes").getJSONObject(0)
                val leg = route.getJSONArray("legs").getJSONObject(0)
                val distanceText = leg.getJSONObject("distance").optString("text", "N/A")
                val durationTraffic = leg.optJSONObject("duration_in_traffic")
                val durationText = durationTraffic?.optString("text")
                    ?: leg.getJSONObject("duration").optString("text", "N/A")
                val points = route.getJSONObject("overview_polyline").optString("points")
                val path = decodePolyline(points)
                val etaLabel = "$durationText ($distanceText)"

                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    if (path.isNotEmpty()) {
                        map.addPolyline(
                            PolylineOptions()
                                .addAll(path)
                                .width(10f)
                                .color(Color.parseColor("#2563EB"))
                                .geodesic(true)
                        )
                        val builder = LatLngBounds.builder()
                        path.forEach { builder.include(it) }
                        try {
                            map.animateCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 90))
                        } catch (_: Exception) {
                            map.moveCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 90))
                        }
                    } else {
                        drawStraightFallback(map, origin, destination)
                    }
                    etaBadgeText?.text = etaLabel
                    etaBadgeText?.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Directions fetch failed: ${e.message}", e)
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    etaBadgeText?.text = "Route unavailable"
                    drawStraightFallback(map, origin, destination)
                }
            }
        }.start()
    }

    private fun drawStraightFallback(map: GoogleMap, origin: LatLng, destination: LatLng) {
        map.addPolyline(
            PolylineOptions()
                .add(origin, destination)
                .width(8f)
                .color(Color.parseColor("#718096"))
        )
    }

    /**
     * Decodes Google encoded polyline algorithm into LatLng points.
     */
    private fun decodePolyline(encoded: String?): List<LatLng> {
        if (encoded.isNullOrEmpty()) return emptyList()
        val poly = ArrayList<LatLng>()
        var index = 0
        val len = encoded.length
        var lat = 0
        var lng = 0

        while (index < len) {
            var b: Int
            var shift = 0
            var result = 0
            do {
                b = encoded[index++].code - 63
                result = result or ((b and 0x1f) shl shift)
                shift += 5
            } while (b >= 0x20)
            val dlat = if ((result and 1) != 0) (result shr 1).inv() else result shr 1
            lat += dlat

            shift = 0
            result = 0
            do {
                b = encoded[index++].code - 63
                result = result or ((b and 0x1f) shl shift)
                shift += 5
            } while (b >= 0x20)
            val dlng = if ((result and 1) != 0) (result shr 1).inv() else result shr 1
            lng += dlng

            poly.add(LatLng(lat / 1E5, lng / 1E5))
        }
        return poly
    }

    private fun teardownMap() {
        try {
            googleMap = null
            mapView?.onPause()
            mapView?.onDestroy()
        } catch (e: Exception) {
            android.util.Log.w("FullScreenOverlay", "⚠️ Map teardown: ${e.message}")
        } finally {
            mapView = null
        }
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
        
        layoutParams.type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        
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
        
        layoutParams.width = WindowManager.LayoutParams.MATCH_PARENT
        layoutParams.height = WindowManager.LayoutParams.MATCH_PARENT
        layoutParams.gravity = Gravity.CENTER
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
            
            rejectBookingOnBackend(bookingId, resolvedWorkerId)
            
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error rejecting booking: ${e.message}")
            e.printStackTrace()
        }
    }
    
    private fun stopVibrationAndHide() {
        hide()
        MyFirebaseMessagingService.clearActiveOverlayBooking(currentBookingId)
        
        Thread {
            try {
                MyFirebaseMessagingService.stopOverlayVibration()
                android.util.Log.d("FullScreenOverlay", "📳 Vibration stopped by user action")
                
                if (context is OverlayNotificationService) {
                    context.stopVibrationAndService()
                }
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error stopping vibration: ${e.message}")
            }
        }.start()
    }
    
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
                
                val json = JSONObject().apply {
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
                
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error calling accept API: ${e.message}")
            }
        }.start()
    }
    
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
                
                val json = JSONObject().apply {
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
                
            } catch (e: Exception) {
                android.util.Log.e("FullScreenOverlay", "❌ Error calling reject API: ${e.message}")
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
            val sharedPrefs = context.getSharedPreferences("worker_prefs", Context.MODE_PRIVATE)
            sharedPrefs.getString("worker_id", null)
        } catch (e: Exception) {
            android.util.Log.e("FullScreenOverlay", "❌ Error reading worker ID from storage: ${e.message}")
            null
        }
    }
    
    private fun formatBookingTime(bookingTime: String?): String {
        if (bookingTime.isNullOrEmpty()) {
            return "N/A"
        }

        val outputFormat = java.text.SimpleDateFormat("yyyy-MM-dd hh:mm:ss a", java.util.Locale.getDefault())
        val possibleFormats = listOf(
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        )

        for (pattern in possibleFormats) {
            try {
                val inputFormat = java.text.SimpleDateFormat(pattern, java.util.Locale.getDefault())
                if (pattern.contains("'Z'")) {
                    inputFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
                } else {
                    inputFormat.timeZone = java.util.TimeZone.getDefault()
                }
                
                val date = inputFormat.parse(bookingTime)
                if (date != null) {
                    outputFormat.timeZone = java.util.TimeZone.getDefault()
                    return outputFormat.format(date)
                }
            } catch (e: Exception) {
                android.util.Log.d("FullScreenOverlay", "⚠️ Failed to parse time with pattern $pattern: ${e.message}")
            }
        }

        android.util.Log.w("FullScreenOverlay", "⚠️ Could not parse booking time: $bookingTime")
        return bookingTime
    }
}
