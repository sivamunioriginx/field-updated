// Test script to send booking alert to worker when app is closed
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need your service account key)
const serviceAccount = require('./backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function testBackgroundNotification() {
  // Replace with actual worker FCM token from your database
  const workerFcmToken = 'eMpL4UQoS8erxGNY0OUCON:APA91bGwkXMuzYV-EdDu7LAQ07JDrLno_7uilljgSFWrwWNKFL5kd1qT9xyRddEEXPllhlQG3xLQu8k0_BPYWNmg8oJIN5jMzEC2nxiogtJEAccVrlhKA34';
  
  const message = {
    data: {
      type: 'booking_alert',
      booking_id: 'TEST_BOOKING_123',
      customer_name: 'Test Customer',
      customer_mobile: '1234567890',
      work_location: 'Test Location',
      description: 'Test booking for background notification',
      booking_time: new Date().toISOString(),
      worker_id: '1',
      timestamp: Date.now().toString(),
      work_type: 'Test Service',
      notification_title: '🚨 URGENT: New Booking Request!',
      notification_body: 'Test Customer needs Test Service at Test Location',
      fullscreen: 'true',
      priority: 'high',
      ttl: '3600',
      collapse_key: 'booking_TEST_BOOKING_123',
    },
    android: {
      priority: 'high',
      data: {
        type: 'booking_alert',
        booking_id: 'TEST_BOOKING_123',
        customer_name: 'Test Customer',
        customer_mobile: '1234567890',
        work_location: 'Test Location',
        description: 'Test booking for background notification',
        booking_time: new Date().toISOString(),
        worker_id: '1',
        timestamp: Date.now().toString(),
        work_type: 'Test Service',
        notification_title: '🚨 URGENT: New Booking Request!',
        notification_body: 'Test Customer needs Test Service at Test Location',
        fullscreen: 'true',
      }
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'background',
      },
      payload: {
        aps: {
          'content-available': 1,
          'mutable-content': 1,
        },
        data: {
          type: 'booking_alert',
          booking_id: 'TEST_BOOKING_123',
          customer_name: 'Test Customer',
          customer_mobile: '1234567890',
          work_location: 'Test Location',
          description: 'Test booking for background notification',
          booking_time: new Date().toISOString(),
          worker_id: '1',
          timestamp: Date.now().toString(),
          notification_title: '🚨 URGENT: New Booking Request!',
          notification_body: 'Test Customer needs Test Service at Test Location',
        }
      }
    },
    token: workerFcmToken
  };

  try {
    console.log('🚨 Sending test background notification...');
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    console.log('📱 Check your device - app should be CLOSED');
    console.log('🔍 Look for fullscreen overlay or regular notification');
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

testBackgroundNotification();
