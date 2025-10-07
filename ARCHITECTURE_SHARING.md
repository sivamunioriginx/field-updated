# 🏗️ Architecture: Sharing APKs with ngrok

Visual guide to understand how everything connects when sharing APKs with friends.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR FRIEND                               │
│                                                                  │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │  Customer APK   │              │   Worker APK    │          │
│  │   📱 Android    │              │   📱 Android    │          │
│  └────────┬────────┘              └────────┬────────┘          │
│           │                                │                    │
│           └────────────┬───────────────────┘                    │
│                        │                                        │
│                   HTTPS Requests                                │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
            ╔════════════════════════╗
            ║   INTERNET (Public)    ║
            ╚════════════════════════╝
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NGROK SERVICE                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Public URL: https://abc123xyz.ngrok.io                   │  │
│  │  Routes traffic to your computer                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                        Tunnel through
                          firewall
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR COMPUTER                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ngrok Client                                             │  │
│  │  Port: 3001 → ngrok.io                                    │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                             │
│                   ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Backend Server (Node.js + Express)                       │  │
│  │  Port: 3001                                               │  │
│  │  - API Endpoints                                          │  │
│  │  - File uploads                                           │  │
│  │  - Authentication                                         │  │
│  │  - Business logic                                         │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                             │
│                   ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MySQL Database                                           │  │
│  │  Port: 3306                                               │  │
│  │  - Users                                                  │  │
│  │  - Bookings                                               │  │
│  │  - Workers                                                │  │
│  │  - Services                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### When your friend uses the app:

```
1. Friend opens Customer/Worker APK
   📱 "Login" button pressed
   
2. App sends HTTPS request
   → https://abc123xyz.ngrok.io/api/login
   
3. Request goes through Internet
   🌐 Public internet routing
   
4. ngrok receives request
   ✅ Validates and forwards
   
5. Request arrives at your computer
   🖥️ Forwarded to localhost:3001
   
6. Backend processes request
   📝 Checks database
   🔐 Validates credentials
   
7. Database query executed
   💾 SELECT * FROM users WHERE...
   
8. Response sent back
   Backend → ngrok → Internet → Friend's phone
   
9. App displays result
   📱 "Login successful!" or error message
```

---

## 📡 Communication Pattern

```
┌─────────────┐     HTTPS      ┌──────────┐     Tunnel    ┌──────────┐
│ Friend's    │───────────────>│  ngrok   │─────────────>│  Your    │
│ Phone       │                │ Service  │              │ Computer │
│             │<───────────────│          │<─────────────│          │
└─────────────┘   Response     └──────────┘   Response   └──────────┘
     APK                                                      Backend
```

---

## 🗂️ File Structure (What You Built)

```
field-updated/
│
├── 📱 APK BUILDS (What you share)
│   ├── Customer APK → Friend installs this
│   └── Worker APK → Friend installs this
│
├── 🌐 API CONFIGURATION
│   └── constants/api.ts
│       ├── Development: http://192.168.31.84:3001/api
│       └── Production: https://abc123xyz.ngrok.io/api ✅
│
├── 🔧 BACKEND (Runs on your computer)
│   └── backend/
│       ├── server.js → Express API
│       ├── database.sql → Database schema
│       └── uploads/ → User files
│
├── 💾 DATABASE (MySQL on your computer)
│   └── field_service database
│
└── 📚 SHARING DOCUMENTATION
    ├── README_SHARING.md → Overview
    ├── QUICK_START_SHARING.md → 5-min guide
    ├── SHARE_APKS_GUIDE.md → Complete guide
    ├── SHARING_TROUBLESHOOTING.md → Fix issues
    ├── start-for-sharing.bat → One-click start
    └── scripts/build-for-sharing.js → Auto-build
```

---

## 🔌 Port Usage

```
╔══════════════════════════════════════════════════════════════╗
║  PORT  │  SERVICE       │  ACCESS      │  DESCRIPTION       ║
╠══════════════════════════════════════════════════════════════╣
║  3001  │  Backend API   │  Local       │  Express server    ║
║  3306  │  MySQL         │  Local       │  Database          ║
║  4040  │  ngrok Web UI  │  Local       │  Monitor tunnel    ║
║  443   │  ngrok Public  │  Internet    │  HTTPS endpoint    ║
╚══════════════════════════════════════════════════════════════╝

📝 Notes:
- Only port 443 (via ngrok) is exposed to internet
- Ports 3001, 3306, 4040 are local only
- Your friend NEVER accesses your computer directly
- All traffic goes through ngrok's secure tunnel
```

---

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  FRIEND'S PHONE                                              │
│  ✅ Only knows ngrok URL                                     │
│  ✅ Cannot access your local network                         │
│  ✅ Cannot access your computer directly                     │
│  ✅ Encrypted HTTPS connection                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                   ┌────▼────┐
                   │  ngrok  │
                   │ Firewall│
                   └────┬────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  YOUR COMPUTER                                               │
│  ✅ Backend only accessible via ngrok                        │
│  ✅ Local ports protected by firewall                        │
│  ✅ Can revoke access by stopping ngrok                      │
│  ✅ Full control over when service is available              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Build Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: PREPARE                                             │
│  ────────────────────────────────────────────────────────   │
│  $ cd backend && npm start                                   │
│  $ ngrok http 3001                                          │
│  Get URL: https://abc123xyz.ngrok.io                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  STEP 2: CONFIGURE                                           │
│  ────────────────────────────────────────────────────────   │
│  Update constants/api.ts:                                    │
│  getBaseUrl() returns:                                       │
│  'https://abc123xyz.ngrok.io/api'                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  STEP 3: BUILD                                               │
│  ────────────────────────────────────────────────────────   │
│  $ npm run build:customer                                    │
│  $ npm run build:worker                                      │
│  Creates: app-release.apk (each)                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  STEP 4: SHARE                                               │
│  ────────────────────────────────────────────────────────   │
│  Send APKs to friend via:                                    │
│  • WhatsApp                                                  │
│  • Google Drive                                              │
│  • Email                                                     │
│  • USB transfer                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  STEP 5: FRIEND INSTALLS                                     │
│  ────────────────────────────────────────────────────────   │
│  1. Enable Unknown Sources                                   │
│  2. Install APKs                                             │
│  3. Open and use!                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Lifecycle States

```
╔════════════════════════════════════════════════════════╗
║                  OPERATIONAL STATES                     ║
╚════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────┐
│  🟢 FULLY OPERATIONAL                                   │
│  ─────────────────────────────────────────────────────│
│  ✅ Computer ON                                         │
│  ✅ MySQL running                                       │
│  ✅ Backend running (port 3001)                         │
│  ✅ ngrok connected (tunnel active)                     │
│  ✅ Internet connected                                  │
│  → Friend can use app normally                          │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  🟡 PARTIALLY WORKING                                   │
│  ─────────────────────────────────────────────────────│
│  ⚠️ Backend slow                                        │
│  ⚠️ Internet connection unstable                        │
│  ⚠️ High CPU usage                                      │
│  → Friend experiences slow performance                  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  🔴 NOT WORKING                                         │
│  ─────────────────────────────────────────────────────│
│  ❌ Computer OFF                                        │
│  ❌ Backend stopped                                     │
│  ❌ ngrok stopped                                       │
│  ❌ Internet disconnected                               │
│  → Friend cannot use app                                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  ⚠️ REQUIRES REBUILD                                    │
│  ─────────────────────────────────────────────────────│
│  🔄 ngrok URL changed                                   │
│  🔄 Computer restarted                                  │
│  🔄 ngrok session expired                               │
│  → Must rebuild APKs with new URL                       │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Example

### Example: Customer books a service

```
1. Customer App (Friend's Phone)
   ↓
   User fills booking form
   ↓
   POST request created
   ↓

2. API Call
   ↓
   URL: https://abc123xyz.ngrok.io/api/bookings
   Method: POST
   Body: { userId, workerId, serviceId, ... }
   ↓

3. Internet Transit
   ↓
   Encrypted HTTPS
   ↓

4. ngrok Service
   ↓
   Validates request
   Forwards to your computer
   ↓

5. Your Computer - Backend (server.js)
   ↓
   Express route: app.post('/api/bookings', ...)
   Validates input
   ↓

6. Database Query
   ↓
   INSERT INTO bookings (...)
   VALUES (...)
   ↓

7. Database Response
   ↓
   Success: booking_id = 123
   ↓

8. Backend Response
   ↓
   JSON: { success: true, bookingId: 123 }
   ↓

9. Response travels back
   ↓
   Backend → ngrok → Internet → Friend's phone
   ↓

10. Customer App displays
   ↓
   "Booking successful! ID: 123"
   ✅ Done!
```

---

## 🔍 Monitoring Dashboard

```
╔════════════════════════════════════════════════════════════╗
║           WHAT TO MONITOR WHILE FRIEND USES APP            ║
╚════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  TERMINAL 1: Backend Server                                  │
│  ──────────────────────────────────────────────────────────│
│  ✅ Server running on port 3001                              │
│  ✅ Database connected                                       │
│  📊 POST /api/login 200 25ms                                │
│  📊 GET /api/workers 200 142ms                              │
│  📊 POST /api/bookings 201 89ms                             │
│  → Shows all API activity                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TERMINAL 2: ngrok                                           │
│  ──────────────────────────────────────────────────────────│
│  Session Status                online                        │
│  Account                       you@email.com                 │
│  Forwarding                    https://abc.ngrok.io -> 3001 │
│  Web Interface                 http://127.0.0.1:4040        │
│  Connections                   ttl   opn   rt1              │
│                               45    0     0.00              │
│  → Shows tunnel status and traffic                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  BROWSER: ngrok Web UI (http://localhost:4040)               │
│  ──────────────────────────────────────────────────────────│
│  Request History:                                            │
│  • POST /api/login           200 OK     25ms               │
│  • GET /api/categories       200 OK     18ms               │
│  • POST /api/bookings        201 Created 89ms              │
│  → Detailed view of all requests                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Critical Points

### ⚠️ Remember These:

1. **ngrok URL is temporary**
   - Changes on restart
   - Must rebuild APKs if URL changes

2. **Your computer must stay on**
   - Backend needs to be running
   - ngrok needs to be connected
   - No sleep mode

3. **Internet required**
   - Both you and friend need internet
   - Your upload speed matters
   - Stable connection recommended

4. **Free tier limitations**
   - 40 connections/minute
   - 2-hour session timeout
   - URL changes each restart

5. **Security**
   - ngrok provides HTTPS encryption
   - Only exposes port 3001 via tunnel
   - Can stop service anytime

---

## 📈 Scaling Considerations

```
CURRENT SETUP (ngrok free):
✅ Good for: 1-5 friends testing
✅ Cost: Free
⚠️ Limit: Your computer must stay on

NGROK PAID ($10/mo):
✅ Good for: 5-20 users
✅ Static domain (no rebuilds)
✅ Better performance
⚠️ Limit: Still need computer on

CLOUD HOSTING (Variable cost):
✅ Good for: 20+ users
✅ Always available (24/7)
✅ Professional deployment
✅ Can scale infinitely
💰 Cost: $5-50/month depending on usage
```

---

## 🎓 Understanding the Components

### ngrok
- **What**: Tunneling service
- **Why**: Exposes local server to internet
- **How**: Creates secure tunnel through firewalls
- **Cost**: Free tier available

### Backend (Node.js + Express)
- **What**: API server
- **Why**: Processes requests, business logic
- **How**: Runs on your computer, port 3001
- **Cost**: Free (runs locally)

### MySQL Database
- **What**: Data storage
- **Why**: Stores users, bookings, workers
- **How**: Runs locally on your computer
- **Cost**: Free (runs locally)

### APK (Android Package)
- **What**: Installable app file
- **Why**: Friend can install on Android
- **How**: Built from React Native code
- **Cost**: Free to build

---

## 🔮 Future: Production Architecture

```
When you deploy to production:

┌─────────────┐
│ Friend's    │
│ Phone       │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Your Domain        │
│  api.yourapp.com    │  ← Your domain
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Cloud Server       │
│  (DigitalOcean/AWS) │  ← Always-on server
│  - Backend          │
│  - Database         │
└─────────────────────┘

Benefits:
✅ Always available (24/7)
✅ Better performance
✅ Professional deployment
✅ Your computer can be off
✅ Supports many users
✅ Static URL (never changes)
```

---

## 📚 Related Documentation

- Setup: `QUICK_START_SHARING.md`
- Troubleshooting: `SHARING_TROUBLESHOOTING.md`
- Complete Guide: `SHARE_APKS_GUIDE.md`
- Overview: `README_SHARING.md`

---

**Understanding the architecture helps troubleshoot issues faster!**

**Keep this document handy for reference. 📖**

