# OriginX Network Troubleshooting Guide

## 🚨 "Network request failed" Error

This error typically occurs when the React Native app can't connect to your backend server. Here's how to fix it:

### Step 1: Check if Backend Server is Running

```bash
cd backend
npm run dev
```

You should see:
```
OriginX Backend Server running on port 3000
Health check: http://localhost:3000/api/health
```

### Step 2: Test Backend Connectivity

Run the API test script:
```bash
node scripts/test-api.js
```

This will test multiple connection endpoints and show you which ones work.

### Step 3: Platform-Specific Fixes

#### 🤖 **Android Emulator**
- **URL**: `http://10.0.2.2:3000/api`
- The emulator maps `10.0.2.2` to your host machine's `localhost`

#### 🍎 **iOS Simulator**
- **URL**: `http://localhost:3000/api`
- iOS simulator can access localhost directly

#### 📱 **Physical Device**
1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Update `constants/api.ts`:
   ```typescript
   // Uncomment and replace with your IP
   return 'http://192.168.1.100:3000/api';
   ```

3. Ensure both device and computer are on the same WiFi network

### Step 4: Database Configuration

Make sure your MySQL database is properly configured:

1. **Start MySQL service**
2. **Create database**:
   ```sql
   CREATE DATABASE originx_farm;
   ```

3. **Run the schema**:
   ```bash
   mysql -u root -p originx_farm < backend/database.sql
   ```

4. **Update credentials** in `backend/server.js`:
   ```javascript
   const dbConfig = {
     host: 'localhost',
     user: 'your_username',     // Update this
     password: 'your_password', // Update this
     database: 'originx_farm',
   };
   ```

### Step 5: Network Security

#### Windows Firewall
1. Open Windows Defender Firewall
2. Allow Node.js through firewall for both Private and Public networks

#### Mac Firewall
1. System Preferences → Security & Privacy → Firewall
2. Add Node.js to allowed applications

#### Antivirus Software
Some antivirus software blocks local server connections. Temporarily disable or add exception for port 3000.

### Step 6: Alternative Testing Methods

#### Test with curl:
```bash
curl http://localhost:3000/api/health
```

#### Test with browser:
Open `http://localhost:3000/api/health` in your browser

#### Test with Postman:
Create a GET request to `http://localhost:3000/api/health`

### Step 7: Common Issues & Solutions

#### Issue: "ECONNREFUSED"
**Solution**: Backend server is not running
```bash
cd backend && npm run dev
```

#### Issue: "getaddrinfo ENOTFOUND"
**Solution**: Wrong hostname/IP address
- Check your IP address
- Update `constants/api.ts`

#### Issue: "Network timeout"
**Solution**: Firewall blocking connection
- Check firewall settings
- Try different IP addresses

#### Issue: "CORS error"
**Solution**: CORS is already enabled in backend, but if needed:
```javascript
app.use(cors({
  origin: true,
  credentials: true
}));
```

#### Issue: "Cannot read property of undefined"
**Solution**: API response format issue
- Check backend logs
- Verify database connection

### Step 8: Debug Mode

Enable detailed logging in your React Native app:

1. Check Metro bundler logs
2. Check device/emulator console logs
3. Look for the debug output:
   ```
   Submitting form data to server...
   API Endpoint: http://10.0.2.2:3000/api/register-professional
   ```

### Step 9: Quick Test Setup

1. **Start backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Test connectivity**:
   ```bash
   node scripts/test-api.js
   ```

3. **Update API config** (if needed):
   Edit `constants/api.ts` with correct IP

4. **Restart React Native**:
   ```bash
   npx expo start --clear
   ```

### Step 10: Production Deployment

For production deployment:

1. Deploy backend to cloud service (Heroku, AWS, etc.)
2. Update `constants/api.ts` with production URL
3. Ensure HTTPS is configured
4. Update CORS settings for production domain

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check the logs**: Look at both React Native and backend server logs
2. **Test step by step**: Use the test script to isolate the problem
3. **Verify network**: Ensure devices are on same network
4. **Check ports**: Make sure port 3000 isn't used by another service

## 📝 Debug Checklist

- [ ] Backend server running on port 3000
- [ ] Database connected and table created
- [ ] Correct IP address in API config
- [ ] Firewall allows port 3000
- [ ] Device and computer on same network
- [ ] No other service using port 3000
- [ ] FormData headers not manually set
- [ ] API endpoint URL is correct

## 🔧 Quick Commands

```bash
# Start backend
cd backend && npm run dev

# Test API
node scripts/test-api.js

# Check what's using port 3000
lsof -i :3000          # Mac/Linux
netstat -ano | find "3000"  # Windows

# Get your IP address
ifconfig | grep inet   # Mac/Linux
ipconfig              # Windows
```