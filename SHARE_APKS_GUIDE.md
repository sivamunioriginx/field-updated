# How to Share APKs with Friends (Using Local Backend)

## Overview
You can share your APKs with friends even without a domain or hosted server by using **ngrok** to expose your local backend to the internet temporarily.

---

## 📋 Prerequisites
- Your computer with the backend running
- Internet connection
- Stable power supply (your computer must stay on)

---

## 🚀 Step-by-Step Guide

### Step 1: Install ngrok

**Option A: Download from Website (Recommended)**
1. Go to https://ngrok.com/
2. Sign up for a free account
3. Download ngrok for Windows
4. Extract the zip file to a folder (e.g., `C:\ngrok\`)

**Option B: Using npm (if you prefer)**
```bash
npm install -g ngrok
```

### Step 2: Set Up ngrok Authentication
1. Log in to your ngrok dashboard: https://dashboard.ngrok.com/
2. Copy your authtoken
3. Run this command to authenticate:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### Step 3: Start Your Local Backend
```bash
cd backend
npm start
```
Your backend should be running on `http://localhost:3001`

### Step 4: Expose Backend with ngrok
Open a **new terminal** and run:
```bash
ngrok http 3001
```

You'll see output like this:
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123xyz.ngrok.io`)

### Step 5: Update API Configuration

Update `constants/api.ts` with your ngrok URL:

```typescript
const getBaseUrl = () => {
  // Use ngrok URL for production builds
  if (!__DEV__) {
    return 'https://abc123xyz.ngrok.io/api'; // Replace with YOUR ngrok URL
  }
  
  // For local development
  return 'http://192.168.31.84:3001/api';
};
```

### Step 6: Build Both APKs

**Build Customer APK:**
```bash
npm run build:customer
```

**Build Worker APK:**
```bash
npm run build:worker
```

The APKs will be created in:
- `android/app/build/outputs/apk/release/app-release.apk`

Rename them after building:
- `field-service-customer.apk`
- `field-service-worker.apk`

### Step 7: Share APKs with Your Friend

1. Send both APK files via:
   - WhatsApp
   - Google Drive
   - Email
   - USB transfer
   - Any file sharing method

2. **Important:** Tell your friend:
   - Your computer must be ON and running the backend
   - ngrok must be running
   - Internet connection must be stable

### Step 8: Friend Installs APKs

Your friend needs to:
1. Enable "Install from Unknown Sources" on their Android device
2. Install both APKs
3. Open the apps and start using them!

---

## ⚠️ Important Notes

### Free ngrok Limitations
- URL changes every time you restart ngrok
- Limited to 40 connections per minute
- Session timeout after 2 hours (free tier)

### Solutions for Limitations:

**Problem:** ngrok URL changes every restart
**Solution:** Use ngrok's static domain (paid plan ~$10/month) OR rebuild APKs with new URL

**Problem:** Your computer must stay on
**Solution:** Keep computer plugged in and prevent sleep mode

**Problem:** Internet disconnection
**Solution:** When internet reconnects, restart ngrok and backend

---

## 🔄 Alternative Option: Share Backend Code Too

If your friend is technical, you can share:
1. The APKs
2. The backend folder
3. Database SQL file

**Advantages:**
- Your computer doesn't need to stay on
- No internet dependency
- Your friend has full control

**Steps for your friend:**
1. Install Node.js and MySQL
2. Import the database
3. Run `npm install` in backend folder
4. Update their `backend/.env` with their database credentials
5. Run `npm start` to start backend
6. Get their local IP address
7. Rebuild APKs with their IP address

---

## 🛠️ Troubleshooting

### ngrok URL not working
- Check if backend is running: `http://localhost:3001/api/health`
- Check if ngrok is running and showing "online" status
- Verify the URL in `constants/api.ts` matches ngrok URL exactly
- Make sure to include `/api` at the end

### APK installation failed on friend's device
- Ensure they enabled "Unknown Sources"
- Try installing via ADB if available
- Check if APK file is not corrupted during transfer

### App not connecting to backend
- Verify ngrok is running
- Check backend logs for errors
- Ensure your computer has internet connection
- Test ngrok URL in browser: `https://your-url.ngrok.io/api/health`

### Database connection errors
- Check MySQL is running
- Verify database credentials in `backend/.env`
- Ensure database tables are created

---

## 💡 Best Practices

1. **Keep Everything Running:** Don't close backend, ngrok, or shut down computer
2. **Monitor Logs:** Watch terminal for errors
3. **Test First:** Install and test APKs on your own device before sharing
4. **Communicate:** Let your friend know when backend will be available
5. **Use Stable Connection:** Connect to reliable WiFi or ethernet

---

## 📱 Testing Before Sharing

Before sending to your friend, test on your own device:

1. Build APK with ngrok URL
2. Install on your phone
3. Connect phone to mobile data (not WiFi)
4. Open app and test all features
5. If everything works, send to friend!

---

## 🌐 Future: When You Get a Server

When you're ready to deploy properly:

1. Get a VPS (DigitalOcean, AWS, Heroku)
2. Get a domain name
3. Deploy backend to server
4. Update `constants/api.ts` with production URL
5. Rebuild APKs
6. Your computer no longer needs to stay on!

---

## Summary

**What you need to do:**
1. Install and run ngrok
2. Update API config with ngrok URL
3. Build APKs
4. Send APKs to friend
5. Keep computer + backend + ngrok running

**What your friend needs to do:**
1. Install APKs
2. Use the apps normally
3. Let you know if there are any issues

Good luck! 🎉

