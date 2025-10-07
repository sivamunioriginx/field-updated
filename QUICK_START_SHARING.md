# 🚀 Quick Start: Share APKs with Friends

This is the **fastest way** to share your APKs with friends using your local backend.

---

## ⚡ Quick Steps (5 minutes)

### 1️⃣ Install ngrok
Download from: https://ngrok.com/download
- Sign up (free)
- Download for Windows
- Extract to any folder

### 2️⃣ Authenticate ngrok
```bash
ngrok config add-authtoken YOUR_TOKEN_FROM_DASHBOARD
```

### 3️⃣ Start Backend
```bash
cd backend
npm start
```
✅ Should show: "Server running on port 3001"

### 4️⃣ Start ngrok (in new terminal)
```bash
ngrok http 3001
```
✅ Copy the **https URL** shown (e.g., `https://abc123xyz.ngrok.io`)

### 5️⃣ Build APKs with ngrok URL
```bash
npm run build:share
```
- Enter your ngrok URL when prompted
- Choose to build both APKs (y)
- Wait 5-10 minutes

### 6️⃣ Find and Share APKs
APKs are in: `android/app/build/outputs/apk/release/app-release.apk`

**Rename them:**
- First build → `field-service-customer.apk`
- Second build → `field-service-worker.apk`

**Send to friend via:**
- WhatsApp
- Google Drive
- Email
- Any file sharing method

---

## ⚠️ Critical Requirements

### Your Computer Must:
- ✅ Stay ON (don't shut down or sleep)
- ✅ Keep backend running (`npm start` in backend folder)
- ✅ Keep ngrok running (`ngrok http 3001`)
- ✅ Stay connected to internet

### Your Friend Must:
- ✅ Enable "Install from Unknown Sources" on Android
- ✅ Install both APKs
- ✅ Have internet connection

---

## 🧪 Test Before Sharing

1. Install the APK on YOUR phone first
2. **Important:** Disconnect from WiFi, use mobile data
3. Test login, registration, and main features
4. If it works on mobile data → safe to share!

---

## 🔧 Troubleshooting

### "Build failed"
```bash
cd android
./gradlew clean
cd ..
npm run build:share
```

### "ngrok URL not accessible"
- Check backend is running: `http://localhost:3001/api/health`
- Copy the HTTPS URL (not HTTP)
- Make sure ngrok shows "Session Status: online"

### "Friend can't connect"
- Verify YOUR computer is on
- Check backend terminal for activity
- Check ngrok terminal shows requests
- Ask friend to check their internet

### "ngrok URL changed"
- This happens if you restart ngrok
- You must rebuild APKs with the new URL
- Send new APKs to your friend

---

## 💡 Tips

1. **Power Settings:** Disable sleep mode on your computer
   - Windows: Settings > System > Power > Screen and sleep > Never

2. **Stable Internet:** Use ethernet cable if possible

3. **Monitor Logs:** Keep terminal windows visible to see activity

4. **Firewall:** Windows might ask to allow Node.js - click "Allow"

5. **Test URL in Browser:** `https://your-url.ngrok.io/api/health`
   - Should show: `{"status":"ok"}`

---

## 📊 What Your Friend Will See

### Customer App:
- Register as customer
- Search for workers
- Book services
- View bookings

### Worker App:
- Register as worker
- Receive booking notifications
- Accept/reject bookings
- View earnings

---

## 💰 ngrok Free vs Paid

### Free (What you have):
- ✅ Unlimited data transfer
- ✅ HTTPS URLs
- ❌ URL changes every restart
- ❌ 40 connections/minute limit
- ❌ Session timeout after 2 hours

### Paid ($10/month):
- ✅ Static URL (never changes)
- ✅ No connection limits
- ✅ No session timeout
- ✅ Custom domains

**For testing with friends:** Free is enough!  
**For serious use:** Consider paid or deploy to a real server

---

## 🎯 Checklist Before Sending

- [ ] Backend is running and shows no errors
- [ ] ngrok is running and shows "online" status
- [ ] Built APKs with correct ngrok URL
- [ ] Tested APK on your own phone with mobile data
- [ ] Renamed APKs appropriately
- [ ] Sent APKs to friend
- [ ] Told friend to enable "Unknown Sources"
- [ ] Computer is plugged in (won't sleep)
- [ ] You plan to keep computer on while friend tests

---

## 📞 Support Your Friend

Share this message with your friend:

```
Hey! I've sent you two APKs:
1. field-service-customer.apk - for customers
2. field-service-worker.apk - for workers

To install:
1. Go to Settings > Security > Enable "Install from Unknown Sources"
2. Download both APK files I sent
3. Tap each file to install
4. Open the app and register!

Important: My computer must be ON for the apps to work.
Let me know when you want to test so I make sure everything is running!
```

---

## 🚀 Next Steps

### When Ready for Production:
1. Get a VPS (DigitalOcean, AWS, Heroku)
2. Deploy backend to server
3. Get a domain name
4. Update API URLs
5. Rebuild APKs
6. Your computer no longer needs to stay on!

### For Now:
Enjoy testing with your friends! 🎉

---

## 📚 More Help

- Full detailed guide: `SHARE_APKS_GUIDE.md`
- ngrok docs: https://ngrok.com/docs
- Expo build docs: https://docs.expo.dev/

---

**Questions? Issues?**
Check the detailed guide in `SHARE_APKS_GUIDE.md`

**Happy sharing! 🎊**

