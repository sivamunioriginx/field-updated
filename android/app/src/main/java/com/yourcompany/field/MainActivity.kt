package com.yourcompany.field
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import android.util.Log
import android.content.Intent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import com.yourcompany.field.BuildConfig

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    
    // Handle incoming intents from notifications
    handleIncomingIntent(intent)
  }
  
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleIncomingIntent(intent)
  }
  
  private fun handleIncomingIntent(intent: Intent?) {
    intent?.let { incomingIntent ->
      Log.d("MainActivity", "🚨 Handling incoming intent: ${incomingIntent.action}")
      
      // Check if this is from a fullscreen notification
      val fromFullscreen = incomingIntent.getBooleanExtra("from_fullscreen_notification", false)
      val bookingId = incomingIntent.getStringExtra("booking_id")
      val bookingAction = incomingIntent.getStringExtra("booking_action")
      
      if (fromFullscreen && bookingId != null && bookingAction != null) {
        Log.d("MainActivity", "🚨 Fullscreen notification action: $bookingAction for booking: $bookingId")
        
        // Store the action for React Native to handle
        val actionData = mapOf(
          "booking_id" to bookingId,
          "action" to bookingAction,
          "timestamp" to System.currentTimeMillis()
        )
        
        // You can use SharedPreferences or other storage to pass data to React Native
        val prefs = getSharedPreferences("notification_actions", MODE_PRIVATE)
        prefs.edit().putString("pending_action", actionData.toString()).apply()
        
        Log.d("MainActivity", "🚨 Stored action data for React Native: $actionData")
      }
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
