# Firebase Notifications Setup Guide

This guide explains how Firebase Cloud Messaging (FCM) has been integrated into your dual APK field service application.

## Overview

The Firebase integration includes:
- **Backend**: Firebase Admin SDK for sending notifications
- **Frontend**: React Native Firebase for receiving notifications
- **Dual APK Support**: Separate Firebase projects for Customer and Worker apps

## Files Added/Modified

### Backend Files
- `backend/serviceAccountKey.json` - Firebase service account key
- `backend/package.json` - Added firebase-admin dependency
- `backend/server.js` - Added Firebase Admin SDK initialization and notification endpoints
- `backend/add_fcm_token_column.sql` - Database migration script

### Frontend Files
- `services/FirebaseNotificationService.ts` - Core notification service
- `hooks/useFirebaseNotifications.ts` - React hook for notification management
- `components/NotificationInitializer.tsx` - App initialization component
- `components/NotificationTest.tsx` - Test component for notifications
- `contexts/AuthContext.tsx` - Updated to register FCM tokens
- `app/_layout.tsx` - Added notification initializer
- `package.json` - Added Firebase dependencies

### Android Configuration
- `android/build.gradle` - Added Google Services plugin
- `android/app/build.gradle` - Added Firebase dependencies and flavor-specific configuration
- `android/app/google-services.json` - Customer app Firebase config
- `android/app/worker-google-services.json` - Worker app Firebase config

### App Configuration
- `app-customer.json` - Added Firebase plugins
- `app-worker.json` - Added Firebase plugins

## Setup Steps

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (from project root)
npm install
```

### 2. Database Setup

Run the database migration script to add FCM token columns:

```sql
-- Run this in your MySQL database
source backend/add_fcm_token_column.sql
```

### 3. Firebase Configuration

The Firebase configuration files should already be in place:
- `android/app/google-services.json` (Customer app)
- `android/app/worker-google-services.json` (Worker app)
- `backend/serviceAccountKey.json` (Backend service account)

### 4. Build APKs

Build both APKs with Firebase integration:

```bash
# Build Customer APK
gradlew.bat assembleCustomerDebug

# Build Worker APK  
gradlew.bat assembleWorkerDebug
```

## API Endpoints

### Store FCM Token
```
POST /api/fcm-token
{
  "user_id": 123,
  "user_type": "professional", // or "seeker"
  "fcm_token": "fcm_token_string"
}
```

### Send Notification to User
```
POST /api/send-notification
{
  "user_id": 123,
  "user_type": "professional",
  "title": "Notification Title",
  "body": "Notification Body",
  "data": {
    "key": "value"
  }
}
```

### Send Broadcast Notification
```
POST /api/send-notification-broadcast
{
  "user_type": "professional", // or "seeker"
  "title": "Broadcast Title",
  "body": "Broadcast Body",
  "data": {
    "key": "value"
  }
}
```

### Send Booking Notification
```
POST /api/send-booking-notification
{
  "booking_id": "booking_123",
  "status": 1, // 1=Accepted, 2=Completed, 3=Rejected
  "worker_id": 456,
  "user_id": 789
}
```

## Usage in React Native

### Using the Hook
```typescript
import { useFirebaseNotifications } from '../hooks/useFirebaseNotifications';

const MyComponent = () => {
  const { 
    isInitialized, 
    fcmToken, 
    areNotificationsEnabled, 
    sendTestNotification 
  } = useFirebaseNotifications();

  // Your component logic
};
```

### Using the Service Directly
```typescript
import FirebaseNotificationService from '../services/FirebaseNotificationService';

const notificationService = FirebaseNotificationService.getInstance();
await notificationService.registerTokenWithBackend(userId, userType);
```

## Testing Notifications

1. **Add the test component** to any screen:
```typescript
import NotificationTest from '../components/NotificationTest';

// In your component's render method
<NotificationTest />
```

2. **Test via API**:
```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "user_type": "professional",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## Notification Types

### Booking Notifications
- **Status 1 (Accepted)**: "Booking Accepted! Your booking has been accepted by [Worker Name]"
- **Status 2 (Completed)**: "Work Completed! Your work has been completed by [Worker Name]"
- **Status 3 (Rejected)**: "Booking Rejected Your booking has been rejected by [Worker Name]"

### Custom Notifications
- Use the `/api/send-notification` endpoint for custom notifications
- Use the `/api/send-notification-broadcast` endpoint for announcements

## Troubleshooting

### Common Issues

1. **FCM Token not generated**:
   - Check if notification permissions are granted
   - Verify Firebase configuration files are correct
   - Check device internet connection

2. **Notifications not received**:
   - Verify FCM token is registered in database
   - Check Firebase project configuration
   - Ensure app is not in battery optimization mode

3. **Build errors**:
   - Clean and rebuild: `gradlew.bat clean`
   - Check Google Services plugin configuration
   - Verify Firebase dependencies are installed

### Debug Steps

1. **Check FCM Token**:
```typescript
const token = await messaging().getToken();
console.log('FCM Token:', token);
```

2. **Check Notification Permission**:
```typescript
const authStatus = await messaging().hasPermission();
console.log('Permission status:', authStatus);
```

3. **Check Backend Logs**:
   - Look for Firebase initialization messages
   - Check for notification sending errors

## Security Notes

- Keep `serviceAccountKey.json` secure and never commit to version control
- Use environment variables for sensitive configuration
- Implement proper authentication for notification endpoints
- Consider rate limiting for notification endpoints

## Next Steps

1. **Customize notification appearance** in the app
2. **Add notification categories** for different types of messages
3. **Implement notification history** in the app
4. **Add notification preferences** for users
5. **Set up notification analytics** in Firebase Console
