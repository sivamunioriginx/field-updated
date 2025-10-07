# ✅ APK Sharing Checklist

Quick reference for building and sharing APKs.

---

## 🎯 Pre-flight Check

- [x] ngrok installed ✅
- [x] ngrok authenticated ✅
- [ ] Backend started
- [ ] ngrok tunnel running
- [ ] APKs built
- [ ] APKs shared with friend

---

## 🚀 Build APKs Now

### Terminal 1: Backend
```bash
cd backend
npm start
```
**Wait for:** `✅ Server running on port 3001`

---

### Terminal 2: ngrok
```bash
.\ngrok.exe http 3001
```
**Copy:** The HTTPS URL (e.g., `https://abc123xyz.ngrok.io`) 📋

---

### Terminal 3: Build APKs
```bash
npm run build:share
```
**When prompted:**
1. Paste your ngrok URL
2. Type `y` to build both APKs
3. Wait 5-10 minutes per APK

---

## 📦 After Building

### Find APKs at:
```
android\app\build\outputs\apk\release\app-release.apk
```

### Rename them:
- First build → `field-service-customer.apk`
- Second build → `field-service-worker.apk`

---

## 📤 Share with Friend

### Send both APKs via:
- WhatsApp
- Google Drive  
- Email
- USB transfer

### Tell friend:
```
1. Settings > Security > Enable "Unknown Sources"
2. Install both APKs
3. Open and use!

Note: My computer must be ON for apps to work.
```

---

## ⚠️ While Friend Uses App

Keep these running:
- ✅ Backend (Terminal 1)
- ✅ ngrok (Terminal 2)
- ✅ Computer ON
- ✅ Internet connected

---

## 🧪 Test Before Sharing

- [ ] Install APK on YOUR phone
- [ ] Disconnect WiFi (use mobile data)
- [ ] Test login/register
- [ ] Test all features
- [ ] If works → share with friend ✅

---

## 🔍 Quick Troubleshooting

### Backend won't start?
```bash
cd backend
npm install
npm start
```

### Build fails?
```bash
cd android
.\gradlew clean
cd ..
npm run build:share
```

### Friend can't connect?
Test in browser: `https://your-ngrok-url.ngrok.io/api/health`
Should return: `{"status":"ok"}`

---

## 📞 Your ngrok Info

**Your auth token:** `33j0xuRVIOu7...` ✅ (saved)  
**Config location:** `C:\Users\Siva Muni\AppData\Local\ngrok\ngrok.yml`

**Current ngrok URL:** (Copy from Terminal 2 after starting)
```
Write it here: ________________________________
```

---

## ⚡ Quick Commands

```bash
# Start backend
cd backend && npm start

# Start ngrok  
.\ngrok.exe http 3001

# Build APKs
npm run build:share

# One-click (Windows)
start-for-sharing.bat
```

---

## 📊 Progress Tracker

### Setup Phase:
- [x] Download ngrok
- [x] Authenticate ngrok
- [x] Read documentation

### Build Phase:
- [ ] Start backend
- [ ] Start ngrok
- [ ] Note ngrok URL
- [ ] Build Customer APK
- [ ] Build Worker APK
- [ ] Rename APKs

### Share Phase:
- [ ] Test on my phone
- [ ] Send to friend
- [ ] Friend installs
- [ ] Friend tests
- [ ] Success! 🎉

---

## 🎯 Current Status

**You are here:** ✅ Setup complete, ready to build!

**Next:** Open 2 new terminals and follow steps above

**Time needed:** 10-20 minutes (including build time)

---

## 💡 Tips

1. Keep all terminals visible
2. Don't close any terminal windows
3. Write down your ngrok URL
4. Test on your phone first
5. Keep computer plugged in

---

## 📚 Documentation

- `SETUP_NOW.md` - Your personalized guide
- `QUICK_START_SHARING.md` - 5-minute guide
- `SHARE_APKS_GUIDE.md` - Complete guide
- `SHARING_TROUBLESHOOTING.md` - Fix issues
- `CHECKLIST.md` - This file

---

**Ready? Open 2 new terminals and let's build! 🚀**

