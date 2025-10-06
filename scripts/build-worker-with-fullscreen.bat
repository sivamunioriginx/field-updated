@echo off
echo 🚀 Building Worker APK with Fullscreen Notification Support...
echo.

echo 📋 Build Configuration:
echo    - Target: Worker APK Only
echo    - Feature: Fullscreen Notifications
echo    - Platform: Android
echo.

echo 🧹 Cleaning previous builds...
cd /d "%~dp0..\android"
call gradlew clean
if %errorlevel% neq 0 (
    echo ❌ Clean failed!
    pause
    exit /b 1
)

echo.
echo 🔧 Building Worker Debug APK...
call gradlew assembleWorkerDebug
if %errorlevel% neq 0 (
    echo ❌ Worker Debug build failed!
    pause
    exit /b 1
)

echo.
echo 🔧 Building Worker Release APK...
call gradlew assembleWorkerRelease
if %errorlevel% neq 0 (
    echo ❌ Worker Release build failed!
    echo ⚠️  Debug build was successful, you can use that for testing
    echo.
) else (
    echo ✅ Worker Release build successful!
    echo.
)

echo 📱 Build Summary:
echo    ✅ Worker Debug APK: android\app\build\outputs\apk\worker\debug\
echo    📁 File: app-worker-debug.apk
if exist "app\build\outputs\apk\worker\release\app-worker-release.apk" (
    echo    ✅ Worker Release APK: android\app\build\outputs\apk\worker\release\
    echo    📁 File: app-worker-release.apk
)

echo.
echo 🚨 FULLSCREEN NOTIFICATION FEATURES INCLUDED:
echo    ✅ Fullscreen notification permissions
echo    ✅ FullscreenNotificationActivity
echo    ✅ Firebase messaging service with fullscreen support
echo    ✅ Worker app detection and routing
echo    ✅ High-priority notification channels
echo    ✅ Test component for debugging
echo.

echo 🔧 To test fullscreen notifications:
echo    1. Install the worker APK on your device
echo    2. Open the app and log in as a worker
echo    3. Use the "Worker Fullscreen Notification Test" panel
echo    4. Or run: node scripts\test-worker-fullscreen-notifications.js [worker_id]
echo.

echo ⚠️  IMPORTANT NOTES:
echo    - Fullscreen notifications ONLY work on the WORKER APK
echo    - Customer APK will show normal notifications
echo    - Test on a physical device for best results
echo    - Ensure device is not in Do Not Disturb mode
echo.

echo ✅ Worker APK build with fullscreen notifications completed!
pause
