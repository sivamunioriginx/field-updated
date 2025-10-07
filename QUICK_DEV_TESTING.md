# 🚀 Quick Development Testing Guide

## Instant Testing Your Design Changes

### ⚡ Fast Development Mode (Recommended)

#### First Time Setup (One-time only)

1. **Connect your Android phone via USB** OR **start an Android emulator**

2. **Enable USB Debugging** on your phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

3. **Build the debug APK** (choose one):

   ```bash
   # For Customer/Service Seeker app
   npx expo run:android --variant customerDebug
   
   # For Worker/Professional app
   npx expo run:android --variant workerDebug
   ```

   This installs a development build on your phone (takes 2-5 minutes).

#### Daily Development Workflow

Once you have the debug APK installed, you can test changes **instantly**:

1. **Start the development server:**

   ```bash
   # For Customer app
   npm run start:customer
   
   # For Worker app
   npm run start:worker
   ```

2. **Open the app on your phone** - it will connect to the dev server automatically

3. **Make design changes** in your code

4. **Save the file** - changes appear **instantly** on your phone! ⚡

5. **Shake your phone** to open the developer menu for:
   - Reload
   - Debug
   - Enable Fast Refresh
   - Element Inspector

### 🔥 Hot Reload Features

- **Fast Refresh**: Most changes appear in < 1 second
- **Component state preserved**: No need to navigate back to your screen
- **Instant feedback**: See design tweaks immediately

### 📱 What Gets Updated Instantly?

✅ **All design changes:**
- Colors, fonts, spacing
- Layout changes
- New components
- Style modifications
- Text changes

✅ **Code changes:**
- Function logic
- State management
- API calls

❌ **What requires rebuild:**
- Native module changes
- Android manifest changes
- New native dependencies
- Build configuration changes

### 🛠️ Useful Commands

```bash
# Start dev server for customer app
npm run start:customer

# Start dev server for worker app
npm run start:worker

# Build and run on connected device (rebuilds if needed)
npm run android:customer
npm run android:worker

# Check connected devices
adb devices

# View app logs
adb logcat | grep ReactNative

# Restart Metro bundler
npm start -- --reset-cache
```

### 🐛 Troubleshooting

**App won't connect to dev server:**
```bash
# Make sure phone and computer are on same WiFi
adb reverse tcp:8081 tcp:8081
```

**Changes not appearing:**
1. Shake phone → Reload
2. Or press `R` twice in the terminal where Metro is running

**Metro bundler issues:**
```bash
npm start -- --reset-cache
```

**Need to rebuild:**
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo run:android --variant customerDebug
```

---

## 🎯 Summary

### For Daily Development:
1. Install debug APK **once**
2. Run `npm run start:customer` or `npm run start:worker`
3. Make changes and save
4. See results **instantly** on your phone!

### For Production/Sharing:
1. Use `node scripts/build-customer.js`
2. Use `node scripts/build-worker.js`
3. APKs in `android/app/build/outputs/apk/`

---

**Pro Tip:** Keep the Metro bundler running in a terminal while you code. Every time you save a file, your changes will automatically appear on your phone in under a second! 🚀

