package com.yourcompany.field

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.annotation.RequiresApi

object BatteryOptimizationHelper {
    
    const val REQUEST_BATTERY_OPTIMIZATION = 1002
    
    /**
     * Check if battery optimization is disabled for this app
     */
    fun isBatteryOptimizationDisabled(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true // Not applicable for older versions
        }
    }
    
    /**
     * Request to disable battery optimization for this app
     */
    @RequiresApi(Build.VERSION_CODES.M)
    fun requestDisableBatteryOptimization(activity: Activity) {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${activity.packageName}")
        }
        activity.startActivityForResult(intent, REQUEST_BATTERY_OPTIMIZATION)
    }
    
    /**
     * Open battery optimization settings for this app
     */
    fun openBatteryOptimizationSettings(context: Context) {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        context.startActivity(intent)
    }
    
    /**
     * Check if battery optimization permission was granted after request
     */
    fun isBatteryOptimizationGranted(context: Context, requestCode: Int): Boolean {
        return if (requestCode == REQUEST_BATTERY_OPTIMIZATION) {
            isBatteryOptimizationDisabled(context)
        } else {
            false
        }
    }
}
