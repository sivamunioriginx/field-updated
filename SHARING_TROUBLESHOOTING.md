# 🔧 Troubleshooting: Sharing APKs

Quick checklist to solve common issues when sharing APKs with friends.

---

## 🚨 Before You Start

### ✅ Pre-flight Checklist
Run through this before building/sharing:

- [ ] Node.js installed
- [ ] MySQL running
- [ ] Backend database setup complete
- [ ] ngrok installed and authenticated
- [ ] Android build tools installed
- [ ] Backend starts without errors: `cd backend && npm start`

---

## 🔍 Common Issues & Solutions

### 1. ngrok Command Not Found

**Symptoms:**
```
'ngrok' is not recognized as an internal or external command
```

**Solutions:**
```bash
# Option A: Add to PATH
1. Find where you extracted ngrok.exe
2. Add that folder to Windows PATH
3. Restart terminal

# Option B: Use full path
C:\Users\YourName\Downloads\ngrok\ngrok.exe http 3001

# Option C: Place in project root
1. Copy ngrok.exe to your project folder
2. Run: .\ngrok.exe http 3001
```

---

### 2. Backend Won't Start

**Symptoms:**
```
Error: Cannot find module 'express'
Error: connect ECONNREFUSED ::1:3306
```

**Solutions:**
```bash
# Missing dependencies
cd backend
npm install

# Database not running
# Start MySQL service (Windows)
net start MySQL80

# Wrong database credentials
# Edit backend/.env file:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=field_service
```

---

### 3. Build Fails

**Symptoms:**
```
FAILURE: Build failed with an exception
Task :app:compileReleaseJavaWithJavac FAILED
```

**Solutions:**
```bash
# Clean build
cd android
gradlew clean
cd ..

# Clear Gradle cache
cd android
gradlew cleanBuildCache
cd ..

# Full rebuild
npm run build:share

# If still fails, check:
# 1. Java JDK installed (version 11 or 17)
# 2. Android SDK installed
# 3. ANDROID_HOME environment variable set
```

---

### 4. APK Installs But Won't Open

**Symptoms:**
- APK installs successfully
- App crashes on launch
- White screen then closes

**Solutions:**
```bash
# Check if APK was built correctly
# Verify files exist:
android/app/build/outputs/apk/release/app-release.apk

# Rebuild with correct app.json
npm run build:customer
npm run build:worker

# Check Android device logs
adb logcat | grep -i "error"
```

---

### 5. Friend Can't Install APK

**Symptoms:**
- "App not installed" error
- "Package appears to be corrupt"
- Installation blocked

**Solutions:**
```
1. Enable Unknown Sources:
   Settings > Security > Unknown Sources (ON)
   
   OR
   
   Settings > Apps > Special Access > Install unknown apps
   > Select browser/file manager > Allow

2. Check APK file:
   - File size > 0 bytes
   - Not corrupted during transfer
   - Try re-sending via different method

3. Uninstall old version first (if exists)

4. Ensure sufficient storage space (500MB+)

5. Try installing via ADB:
   adb install path/to/app.apk
```

---

### 6. App Installs But Can't Connect

**Symptoms:**
- "Network error"
- "Cannot connect to server"
- Timeout errors

**Checklist:**
```
YOUR COMPUTER:
- [ ] Backend running (check terminal)
- [ ] ngrok running (check terminal)
- [ ] Internet connected
- [ ] Firewall allows Node.js
- [ ] Test URL in browser: https://your-url.ngrok.io/api/health

FRIEND'S PHONE:
- [ ] Internet/mobile data enabled
- [ ] Not using VPN
- [ ] Date/time correct
- [ ] No firewall blocking

APK CONFIGURATION:
- [ ] Built with correct ngrok URL
- [ ] URL has /api at the end
- [ ] Using HTTPS (not HTTP)
```

**Test URL:**
```bash
# In browser or Postman:
https://your-ngrok-url.ngrok.io/api/health

# Should return:
{"status":"ok"}
```

---

### 7. ngrok URL Changed

**Symptoms:**
- App worked yesterday, doesn't work today
- Backend running but app can't connect
- New ngrok URL shown in terminal

**This happens when:**
- You restarted ngrok
- ngrok session expired (2 hours on free tier)
- Computer restarted

**Solution:**
```bash
# You MUST rebuild APKs with new URL
1. Note new ngrok URL
2. npm run build:share
3. Enter new URL
4. Send new APKs to friend

# To avoid this:
# - Use ngrok paid plan ($10/mo) for static domain
# - Keep ngrok running continuously
# - Don't restart your computer
```

---

### 8. Slow Performance

**Symptoms:**
- App takes long to load
- Images loading slowly
- Requests timing out

**Solutions:**
```
1. Check your internet speed
   - Upload speed important (friend downloads from you)
   - Test: speedtest.net
   - Minimum 5 Mbps upload recommended

2. Optimize backend
   - Close unnecessary programs
   - Check CPU/memory usage

3. ngrok free tier limitations
   - 40 connections/minute
   - Might throttle on free tier
   - Consider paid plan for better performance

4. Database optimization
   - Index frequently queried columns
   - Optimize slow queries
```

---

### 9. Notifications Not Working

**Symptoms:**
- Push notifications not received
- FCM errors in logs

**Solutions:**
```bash
# Verify Firebase setup
1. google-services.json in android/app/
2. serviceAccountKey.json in backend/
3. Firebase project created

# Test notification:
node scripts/test-notification.js

# Check FCM token:
node scripts/check-fcm-token.js

# Verify backend Firebase init:
# Check backend logs for:
# "🔥 Firebase Admin SDK initialized successfully"
```

---

### 10. Multiple Friends Can't Connect

**Symptoms:**
- One friend works, others don't
- Random disconnections
- "Too many requests" errors

**ngrok Free Tier Limits:**
- 40 connections per minute
- 20,000 requests per month

**Solutions:**
```
1. Check ngrok dashboard for limits
   https://dashboard.ngrok.com/

2. Upgrade to paid plan if needed
   - Unlimited connections
   - Better performance
   - Static domain

3. Stagger testing
   - Don't have all friends test simultaneously
   - Schedule testing windows

4. Monitor usage
   - Watch ngrok terminal for errors
   - Check ngrok dashboard
```

---

## 🔬 Debugging Tools

### Test Backend Locally
```bash
# In browser:
http://localhost:3001/api/health

# Should show:
{"status":"ok"}
```

### Test ngrok Tunnel
```bash
# In browser:
https://your-url.ngrok.io/api/health

# Should show:
{"status":"ok"}
```

### Test from Friend's Phone
```bash
# Ask friend to open in phone browser:
https://your-url.ngrok.io/api/health

# If this works, problem is in the APK
# If this doesn't work, problem is backend/ngrok
```

### Check ngrok Status
```bash
# ngrok web interface:
http://localhost:4040

# Shows:
# - All requests
# - Response times
# - Errors
# - Traffic statistics
```

### View Backend Logs
```bash
# Backend terminal shows:
# - All API requests
# - Database queries
# - Errors
# - Response times
```

### Android Device Logs (if you have physical access)
```bash
# Install ADB, then:
adb devices
adb logcat | grep -i "field"
adb logcat | grep -i "error"
```

---

## 🎯 Step-by-Step Diagnosis

When something goes wrong, follow this:

### Step 1: Verify Backend
```bash
cd backend
npm start

# Should show:
# ✅ Database connected
# ✅ Server running on port 3001
# ✅ Firebase initialized
```

### Step 2: Verify ngrok
```bash
ngrok http 3001

# Should show:
# Session Status: online
# Forwarding: https://xxx.ngrok.io -> http://localhost:3001
```

### Step 3: Test Locally
```bash
# Browser:
http://localhost:3001/api/health

# Should return JSON:
{"status":"ok"}
```

### Step 4: Test ngrok URL
```bash
# Browser:
https://your-url.ngrok.io/api/health

# Should return JSON:
{"status":"ok"}
```

### Step 5: Verify APK Configuration
```bash
# Check constants/api.ts contains:
if (!__DEV__) {
  return 'https://your-url.ngrok.io/api';
}

# Matches your current ngrok URL?
# Has /api at the end?
# Uses HTTPS?
```

### Step 6: Test on Your Phone
```bash
# 1. Install APK on YOUR phone
# 2. Disconnect from WiFi (use mobile data)
# 3. Open app and test
# 4. If works → safe to share
# 5. If doesn't work → check APK configuration
```

---

## 📞 Getting Help

### Information to Collect

When asking for help, provide:

1. **Error messages** (full text)
2. **Backend logs** (last 20 lines)
3. **ngrok logs** (status and URL)
4. **What you tried** (list all solutions attempted)
5. **System info:**
   - Windows version
   - Node.js version: `node -v`
   - npm version: `npm -v`
   - MySQL version
   - ngrok version: `ngrok version`

### Quick Info Commands
```bash
# System info:
node -v
npm -v
ngrok version

# Check ports:
netstat -ano | findstr :3001
netstat -ano | findstr :3306

# Check MySQL:
mysql -u root -p -e "SHOW DATABASES;"
```

---

## 🎓 Prevention Tips

### Avoid Issues Before They Happen

1. **Test before sharing:**
   - Build APK
   - Install on YOUR phone
   - Test with mobile data
   - Try all features
   - Only then share with friends

2. **Keep stable environment:**
   - Don't restart computer mid-session
   - Use ethernet (not WiFi if possible)
   - Disable sleep mode
   - Close unnecessary programs

3. **Monitor everything:**
   - Watch backend terminal
   - Watch ngrok terminal
   - Check for errors regularly

4. **Communicate with friends:**
   - Let them know when you're available
   - Tell them if you need to restart anything
   - Get feedback on performance

5. **Document your ngrok URL:**
   - Write it down
   - If it changes, you'll know immediately

---

## ✅ Success Indicators

You'll know everything is working when:

- ✅ Backend shows no errors
- ✅ ngrok shows "online" status
- ✅ Health endpoint returns `{"status":"ok"}`
- ✅ APK installs without errors
- ✅ App opens without crashes
- ✅ Login/register works
- ✅ All features functional
- ✅ Backend logs show friend's requests
- ✅ ngrok shows incoming traffic
- ✅ Friend reports no issues

---

## 🚨 Emergency Quick Fixes

### Everything Stopped Working?

**Quick Reset:**
```bash
# 1. Stop everything (Ctrl+C in both terminals)

# 2. Restart backend
cd backend
npm start

# 3. Restart ngrok
ngrok http 3001

# 4. If URL changed:
npm run build:share
# Enter new URL, rebuild, resend APKs

# 5. If still broken:
# Restart computer
# Restart MySQL
# Try again
```

---

## 📚 Related Documentation

- Full setup guide: `SHARE_APKS_GUIDE.md`
- Quick start: `QUICK_START_SHARING.md`
- Overview: `README_SHARING.md`
- ngrok docs: https://ngrok.com/docs
- Expo docs: https://docs.expo.dev

---

**Still stuck? Review the full guide or check individual component documentation!**

**Remember: Most issues are either:**
1. ngrok URL changed → rebuild APKs
2. Backend not running → restart backend
3. Configuration mismatch → check api.ts

**Good luck! 🍀**

