# Fullscreen Notifications for Worker APK 🚨

This feature implements fullscreen notifications specifically for the **Worker APK only**. When workers receive urgent booking requests, the notification will appear as a fullscreen overlay that wakes the device and demands immediate attention.

## 🎯 Overview

### What's Implemented
- ✅ **Fullscreen notifications ONLY for Worker APK**
- ✅ **Customer APK remains unchanged** (normal notifications)
- ✅ **Device wake-up** when notification arrives
- ✅ **Lock screen bypass** for urgent alerts
- ✅ **Sound and vibration** patterns
- ✅ **Accept/Reject/Dismiss** actions directly from notification
- ✅ **Auto-detection** of Worker vs Customer app
- ✅ **High-priority notification channels**

### Key Features
1. **App-Specific Behavior**: Only Worker APK shows fullscreen notifications
2. **Urgent Alert System**: Critical booking requests trigger fullscreen overlay
3. **Lock Screen Integration**: Notifications appear even when device is locked
4. **Immediate Action**: Workers can accept/reject bookings without opening the app
5. **Testing Interface**: Built-in test component for debugging

## 📱 Files Modified/Added

### Android Native Components
- `android/app/src/main/AndroidManifest.xml` - Added fullscreen permissions and activity
- `android/app/src/main/java/com/yourcompany/field/FullscreenNotificationActivity.kt` - Main fullscreen activity
- `android/app/src/main/java/com/yourcompany/field/FirebaseMessagingService.kt` - Enhanced messaging service
- `android/app/src/main/res/layout/activity_fullscreen_notification.xml` - Fullscreen UI layout
- `android/app/src/main/res/drawable/*` - Button and background styles

### React Native Components
- `services/FirebaseNotificationService.ts` - Enhanced with worker app detection
- `components/WorkerFullscreenNotificationTest.tsx` - Testing component
- `app/workerindex.tsx` - Added test component integration

### Backend Enhancements
- `backend/server.js` - Enhanced booking alerts with fullscreen flags
- `scripts/test-worker-fullscreen-notifications.js` - Testing script
- `scripts/build-worker-with-fullscreen.bat` - Build script

## 🚀 How It Works

### 1. App Detection
```typescript
// Automatically detects if running on Worker APK
const isWorkerApp = Constants.expoConfig?.extra?.appType === 'worker';
```

### 2. Notification Routing
- **Worker APK**: Booking alerts → Fullscreen notification
- **Customer APK**: All notifications → Normal notification

### 3. Fullscreen Trigger
```kotlin
// Android activity wakes device and shows fullscreen
setShowWhenLocked(true)
setTurnScreenOn(true)
```

### 4. Backend Configuration
```javascript
// Enhanced booking alert with fullscreen flags
android: {
  priority: 'high',
  notification: {
    channelId: 'booking-alerts',
    priority: 'max',
    visibility: 'public'
  }
}
```

## 🔧 Testing the Feature

### Method 1: Using the Built-in Test Component
1. Build and install the **Worker APK**
2. Open the worker app and log in
3. Scroll to find "Worker Fullscreen Notification Test" panel
4. Tap "Test Single Fullscreen" or "Test Multiple (3x)"
5. Lock your device to see fullscreen behavior

### Method 2: Using the Test Script
```bash
# From project root
node scripts/test-worker-fullscreen-notifications.js [worker_id]

# Example:
node scripts/test-worker-fullscreen-notifications.js 1
```

### Method 3: Real Booking Flow
1. Create a real booking through the customer app
2. Assign it to a worker
3. Worker will receive fullscreen notification

## 🏗️ Building the Worker APK

### Quick Build
```bash
# Run the automated build script
scripts/build-worker-with-fullscreen.bat
```

### Manual Build
```bash
cd android
gradlew assembleWorkerDebug
# APK will be in: android/app/build/outputs/apk/worker/debug/
```

## 📋 Notification Behavior

### Worker APK
- **Booking Alerts**: Fullscreen notification with sound/vibration
- **Regular Notifications**: Normal notification bar
- **Device States**: Works when locked, unlocked, or app in background

### Customer APK  
- **All Notifications**: Normal notification bar (no fullscreen)
- **Unchanged Experience**: Customer behavior remains the same

## 🎨 Fullscreen UI Components

### Main Elements
- **Large Alert Icon**: 🚨 emoji for urgency
- **Booking Details**: Customer name, location, time
- **Action Buttons**: Accept (green), Reject (red), Dismiss (gray)
- **Auto-timeout**: Shows countdown timer

### Visual Design
- **Red Background**: Indicates urgency
- **White Card**: Clean details presentation
- **Large Buttons**: Easy touch targets
- **System UI Hidden**: True fullscreen experience

## ⚙️ Configuration Options

### Notification Timing
```typescript
autoRejectTime: 30 // seconds before auto-rejection
```

### Sound & Vibration
```kotlin
val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
```

### Priority Settings
```javascript
android: {
  priority: 'high',
  notification: {
    priority: 'max',
    channelId: 'booking-alerts'
  }
}
```

## 🔒 Permissions Required

The following permissions are added automatically:
- `USE_FULL_SCREEN_INTENT` - Show fullscreen notifications
- `WAKE_LOCK` - Wake device when notification arrives
- `TURN_SCREEN_ON` - Turn on screen for notification
- `SHOW_WHEN_LOCKED` - Show over lock screen

## 🐛 Troubleshooting

### Fullscreen Not Appearing
1. **Check APK**: Ensure you're using the Worker APK, not Customer
2. **Check Permissions**: Grant notification permissions in device settings
3. **Check DND**: Disable Do Not Disturb mode
4. **Check Battery**: Disable battery optimization for the app

### Testing Issues
1. **No FCM Token**: Ensure worker is logged in and token is registered
2. **Backend Connection**: Check if backend server is running
3. **Network**: Ensure device has internet connection

### Build Issues
1. **Clean Build**: Run `gradlew clean` first
2. **Check Dependencies**: Ensure Firebase is properly configured
3. **Google Services**: Verify worker-google-services.json is present

## 📊 Performance Considerations

### Battery Impact
- Fullscreen notifications are only triggered for urgent booking alerts
- Normal notifications use standard system behavior
- Efficient native implementation minimizes battery drain

### Network Usage
- Uses Firebase Cloud Messaging (minimal data)
- No additional network overhead compared to normal notifications

## 🔄 Future Enhancements

### Possible Improvements
- [ ] Snooze functionality for notifications
- [ ] Custom ringtones for different work types
- [ ] Multiple language support for fullscreen UI
- [ ] Analytics for notification response times
- [ ] Worker availability status integration

## 📞 Support

For issues with fullscreen notifications:
1. Check this README first
2. Test with the built-in test component
3. Verify you're using the Worker APK
4. Check device notification settings
5. Review console logs for error messages

---

**⚠️ Important**: Fullscreen notifications ONLY work on the Worker APK. The Customer APK will continue to show normal notifications as before. This ensures workers get immediate alerts for urgent jobs while maintaining the standard experience for customers.
