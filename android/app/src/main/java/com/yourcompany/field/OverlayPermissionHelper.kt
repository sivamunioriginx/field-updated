package com.yourcompany.field

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.annotation.RequiresApi

object OverlayPermissionHelper {
    
    const val REQUEST_OVERLAY_PERMISSION = 1001
    
    /**
     * Check if the app has overlay permission
     */
    fun hasOverlayPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true // Permission not required for older versions
        }
    }
    
    /**
     * Request overlay permission
     */
    @RequiresApi(Build.VERSION_CODES.M)
    fun requestOverlayPermission(activity: Activity) {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${activity.packageName}")
        )
        activity.startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION)
    }
    
    /**
     * Open app settings to manually grant overlay permission
     */
    fun openAppSettings(context: Context) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
        }
        context.startActivity(intent)
    }
    
    /**
     * Check if overlay permission is granted after request
     */
    fun isOverlayPermissionGranted(context: Context, requestCode: Int, resultCode: Int): Boolean {
        return if (requestCode == REQUEST_OVERLAY_PERMISSION) {
            hasOverlayPermission(context)
        } else {
            false
        }
    }
}
