# Android Development Troubleshooting Guide

## Quick Fix Steps

### 1. Check Android SDK Setup
```bash
npm run setup-android
```

### 2. Start Development Server
```bash
npx expo start
```
Then press `a` to run on Android.

### 3. Alternative: Direct Android Build
```bash
npx expo run:android
```

## Common Issues and Solutions

### Issue 1: ADB not recognized
**Solution:**
1. Install Android Studio
2. Set environment variables:
   - `ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk`
   - Add to PATH: `%ANDROID_HOME%\platform-tools`

### Issue 2: No emulator found
**Solution:**
1. Open Android Studio
2. Go to Tools > AVD Manager
3. Create a new virtual device
4. Start the emulator

### Issue 3: Build fails
**Solution:**
1. Clean the project:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```
2. Clear Metro cache:
   ```bash
   npx expo start --clear
   ```

### Issue 4: App crashes on startup
**Solution:**
1. Check logs:
   ```bash
   adb logcat | grep "ReactNativeJS"
   ```
2. Ensure all permissions are properly configured in `app.json`

## Environment Setup

### Required Environment Variables
```bash
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\YourUsername\AppData\Local\Android\Sdk
```

### Required Android SDK Components
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Platform (API 33 or higher)
- Android Emulator
- Android SDK Tools

## Testing Your Setup

1. **Check if emulator is running:**
   ```bash
   adb devices
   ```

2. **Start development server:**
   ```bash
   npx expo start
   ```

3. **Run on Android:**
   - Press `a` in the terminal, or
   - Run `npx expo run:android`

## Debugging Tips

- Use `adb logcat` to view device logs
- Check Metro bundler console for JavaScript errors
- Ensure your emulator has internet access
- Try different API levels if you encounter compatibility issues

## Still Having Issues?

1. Run the setup script: `npm run setup-android`
2. Check if all environment variables are set correctly
3. Ensure Android Studio is properly installed
4. Try creating a new emulator with a different API level
5. Clear all caches and rebuild the project 