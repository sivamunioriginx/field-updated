# Testing Fullscreen Notifications in ALL Scenarios 🧪

## 🎯 Test Checklist - Fullscreen Notifications

### ✅ **Test 1: APK Closed/Killed**
1. **Setup**: Install worker APK and log in
2. **Action**: Force close the app (Recent apps → Swipe away)
3. **Test**: Send notification using test script:
   ```bash
   node scripts/test-worker-fullscreen-notifications.js [worker_id]
   ```
4. **Expected**: Fullscreen notification appears even though app is closed
5. **Verify**: App launches automatically with fullscreen overlay

### ✅ **Test 2: Mobile Locked**
1. **Setup**: Worker APK installed and logged in
2. **Action**: Lock your phone (power button)
3. **Test**: Send notification
4. **Expected**: 
   - Screen turns on automatically
   - Fullscreen notification appears over lock screen
   - Can interact without unlocking phone first
5. **Verify**: No need to enter PIN/pattern to see notification

### ✅ **Test 3: Using Other Apps**
1. **Setup**: Worker APK in background
2. **Action**: Open any other app (YouTube, WhatsApp, etc.)
3. **Test**: Send notification while using the other app
4. **Expected**: Fullscreen notification appears over the current app
5. **Verify**: Other app is paused, notification takes full control

### ✅ **Test 4: Phone in Do Not Disturb**
1. **Setup**: Enable Do Not Disturb mode
2. **Action**: Send notification
3. **Expected**: Should still work (high priority bypasses DND)
4. **Note**: May need to allowlist the app in DND settings

### ✅ **Test 5: Background Restrictions**
1. **Setup**: Check battery optimization settings
2. **Action**: Ensure worker app is NOT battery optimized
3. **Test**: Send notification after phone has been idle for 10+ minutes
4. **Expected**: Still works despite background restrictions

## 🛠️ **Quick Test Commands**

### Using Built-in Test Component
```
1. Open worker APK
2. Find "Worker Fullscreen Notification Test" panel
3. Tap "Test Single Fullscreen" 
4. Immediately close app or lock phone
5. Notification should appear within 2-3 seconds
```

### Using Script (More Realistic)
```bash
# Test with your actual worker ID
node scripts/test-worker-fullscreen-notifications.js 1

# Test multiple notifications
node scripts/test-worker-fullscreen-notifications.js 1
# (script automatically sends 3 different scenarios)
```

### Real Booking Test
```
1. Create real booking via customer app
2. Assign to worker
3. Close worker app completely
4. Booking alert triggers fullscreen notification
```

## ⚠️ **Troubleshooting**

### If Fullscreen Doesn't Appear:

#### Check Permissions
```
Settings → Apps → Field Worker → Notifications
- Allow notifications: ON
- Show on lock screen: ON
- Override Do Not Disturb: ON (if available)
```

#### Check Battery Settings
```
Settings → Battery → Battery Optimization
- Find "Field Worker" app
- Select "Don't optimize"
```

#### Check System Settings
```
Settings → Special access → Display over other apps
- Field Worker: Allow
```

### Android Version Specific Issues:

#### Android 10+ (API 29+)
- Background activity restrictions may block fullscreen
- Solution: Add app to unrestricted battery usage

#### Android 12+ (API 31+)
- Enhanced privacy features may limit fullscreen
- Solution: Grant "Display over other apps" permission

## 🔍 **Debugging Steps**

### 1. Check Logs
```bash
# Connect device via ADB
adb logcat | grep -E "(FCMService|FullscreenNotification)"
```

### 2. Verify FCM Token
```
1. Open worker app
2. Check console logs for "FCM Token registered"
3. Ensure token is not null/empty
```

### 3. Test Network Connection
```
1. Ensure device has internet connection
2. Test with mobile data AND WiFi
3. Check backend server is running
```

### 4. Verify Worker App Detection
```
1. Open worker app
2. Test component should be visible
3. If not visible, app detection failed
```

## ✅ **Expected Behavior Summary**

| Scenario | Screen State | Expected Result |
|----------|--------------|-----------------|
| App closed | Any | ✅ Fullscreen appears, app launches |
| Phone locked | Screen off | ✅ Screen turns on, notification over lock screen |
| Other app active | Screen on | ✅ Notification overlays current app |
| DND mode | Any | ✅ High priority bypasses DND |
| Background | Any | ✅ Service wakes app and shows notification |

## 🎯 **Success Criteria**

### ✅ **Test PASSED if:**
- Notification appears within 2-3 seconds
- Screen wakes up (if locked)
- Sound and vibration play
- Accept/Reject buttons work
- App launches when accepting booking

### ❌ **Test FAILED if:**
- No notification appears after 10 seconds
- Only shows in notification bar (not fullscreen)
- Screen doesn't wake up when locked
- No sound/vibration
- App doesn't launch automatically

---

**🚨 CRITICAL**: Only test with WORKER APK! Customer APK will NOT show fullscreen notifications.
