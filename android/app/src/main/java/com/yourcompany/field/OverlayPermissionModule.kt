package com.yourcompany.field

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class OverlayPermissionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "OverlayPermissionModule"
    }
    
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val hasPermission = OverlayPermissionHelper.hasOverlayPermission(context)
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check overlay permission: ${e.message}", e)
        }
    }
}

