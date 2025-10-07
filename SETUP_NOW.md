# 🚀 Your Personal Setup Guide - START NOW!

✅ **ngrok is already installed in your project folder!**

---

## 📋 Quick Setup (3 Steps, 5 minutes)

### Step 1: Authenticate ngrok (ONE-TIME ONLY)

1. **Open this link:** https://dashboard.ngrok.com/signup
   - Sign up for FREE (or login if you have an account)

2. **Get your auth token:** https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy the token shown on the page

3. **Run this command in your terminal:**
   ```bash
   .\ngrok.exe config add-authtoken YOUR_TOKEN_HERE
   ```
   *(Replace YOUR_TOKEN_HERE with your actual token)*

   **Example:**
   ```bash
   .\ngrok.exe config add-authtoken 2abc123def456ghi789jkl
   ```

---

### Step 2: Start Backend

Open a **NEW terminal** and run:
```bash
cd backend
npm start
```

✅ Wait until you see: `Server running on port 3001`

---

### Step 3: Start ngrok

Open **ANOTHER NEW terminal** and run:
```bash
.\ngrok.exe http 3001
```

✅ You'll see output like:
```
Session Status                online
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3001
```

📝 **COPY THE HTTPS URL** (e.g., `https://abc123xyz.ngrok.io`)

---

## 🎯 Now Build Your APKs

Open **ONE MORE terminal** and run:
```bash
npm run build:share
```

When prompted:
1. **Paste your ngrok URL** (the https one you copied)
2. **Type 'y'** to build both APKs
3. **Wait 5-10 minutes** for builds to complete

---

## 📦 Find Your APKs

After building, APKs will be at:
```
android\app\build\outputs\apk\release\app-release.apk
```

**Important:** You need to build TWICE (once for Customer, once for Worker)

### Rename them:
- First build → `field-service-customer.apk`
- Second build → `field-service-worker.apk`

---

## 📤 Share with Your Friend

Send both APK files via:
- WhatsApp
- Google Drive
- Email
- USB transfer

**Tell your friend:**
```
Hey! Install these APKs:
1. Go to Settings > Security > Enable "Unknown Sources"
2. Install both APK files
3. Open and use!

Note: My computer must be ON for the apps to work.
Let me know when you want to test!
```

---

## ⚡ Even Faster: One-Click Start

Instead of Steps 2 & 3, just **double-click:**
```
start-for-sharing.bat
```

This automatically:
- ✅ Starts backend
- ✅ Starts ngrok
- ✅ Launches build script

---

## ⚠️ IMPORTANT: While Friend Uses App

Keep these running:
- ✅ Backend terminal (don't close)
- ✅ ngrok terminal (don't close)
- ✅ Computer ON
- ✅ Internet connected

---

## 🧪 Test Before Sharing

1. Build APK with ngrok URL
2. Install on YOUR phone
3. **Disconnect from WiFi** (use mobile data)
4. Test all features
5. If it works → safe to share!

---

## 🔧 Troubleshooting

### "ngrok command not found"
✅ **SOLVED!** You already have `ngrok.exe` in your project folder.
Use: `.\ngrok.exe` (with the dot and backslash)

### "Backend won't start"
```bash
cd backend
npm install
npm start
```

### "Build fails"
```bash
cd android
.\gradlew clean
cd ..
npm run build:share
```

### "Friend can't connect"
- Check backend is running
- Check ngrok shows "online"
- Test in browser: `https://your-url.ngrok.io/api/health`
- Should show: `{"status":"ok"}`

---

## 📊 Your Current Status

✅ ngrok downloaded  
✅ ngrok copied to project folder  
⏳ Need to authenticate ngrok (Step 1 above)  
⏳ Need to start backend (Step 2 above)  
⏳ Need to start ngrok (Step 3 above)  
⏳ Need to build APKs  

---

## 🎯 Next Action

**RIGHT NOW, do this:**

1. Open: https://dashboard.ngrok.com/signup
2. Sign up / Login
3. Copy your auth token
4. Run in terminal:
   ```bash
   .\ngrok.exe config add-authtoken YOUR_TOKEN
   ```
5. Then run: `start-for-sharing.bat`

**That's it!** 🎉

---

## 💡 Quick Commands Reference

```bash
# Authenticate ngrok (one-time)
.\ngrok.exe config add-authtoken YOUR_TOKEN

# Start backend
cd backend
npm start

# Start ngrok
.\ngrok.exe http 3001

# Build APKs
npm run build:share

# Or use one-click:
start-for-sharing.bat
```

---

## 📚 Need More Help?

- Quick guide: `QUICK_START_SHARING.md`
- Complete guide: `SHARE_APKS_GUIDE.md`
- Fix issues: `SHARING_TROUBLESHOOTING.md`
- Overview: `START_HERE.md`

---

## 🎊 You're Almost There!

Just authenticate ngrok (Step 1), then run `start-for-sharing.bat`

**Total time:** 5 minutes setup + 10 minutes building = **15 minutes total**

**Ready? Let's go!** 🚀

---

*Your friend will be using your app in no time!*

