const mysql = require('mysql2/promise');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./backend/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function triggerBackendNotification(workerMobile = '7799703461') {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'originx_farm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log(`🔍 Looking for pending bookings (status = 0) for worker: ${workerMobile}`);
    
    // First, get worker ID from mobile number
    const [workers] = await pool.execute(
      'SELECT id FROM tbl_workers WHERE mobile = ? LIMIT 1',
      [workerMobile]
    );

    if (workers.length === 0) {
      console.log(`❌ No worker found with mobile: ${workerMobile}`);
      return;
    }

    const workerId = workers[0].id;
    console.log(`👤 Found worker ID: ${workerId} for mobile: ${workerMobile}`);

    // Get the latest pending booking for this worker
    const [bookings] = await pool.execute(
      'SELECT * FROM tbl_bookings WHERE worker_id = ? AND status = 0 ORDER BY id DESC LIMIT 1',
      [workerId]
    );

    if (bookings.length === 0) {
      console.log(`❌ No pending bookings (status = 0) found for worker ${workerMobile} (ID: ${workerId})`);
      return;
    }

    const booking = bookings[0];
    console.log('📋 Found pending booking:', booking.booking_id);

    // Get worker's FCM token
    const [tokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_id = ? AND user_type = "worker" ORDER BY id DESC LIMIT 1',
      [workerId]
    );

    if (tokens.length === 0) {
      console.log(`❌ No FCM token found for worker ${workerMobile} (ID: ${workerId})`);
      return;
    }

    const fcmToken = tokens[0].fcm_token;
    console.log('📱 Using FCM token:', fcmToken.substring(0, 50) + '...');

    // Prepare booking data (same format as your backend)
    const bookingData = {
      booking_id: booking.booking_id,
      customer_name: 'Test Customer',
      customer_mobile: booking.contact_number || '1234567890',
      work_location: booking.work_location,
      description: booking.description || 'Test booking',
      booking_time: booking.booking_time ? booking.booking_time.toISOString() : new Date().toISOString(),
      work_type: 'Test Service',
      price: '500',
      estimated_duration: '2 hours'
    };

    // Send the notification (using the same message format as your backend)
    const message = {
      notification: {
        title: '🚨 URGENT: New Booking Request!',
        body: `${bookingData.customer_name} needs ${bookingData.work_type} at ${bookingData.work_location}`
      },
      data: {
        type: 'booking_alert',
        booking_id: bookingData.booking_id,
        customer_name: bookingData.customer_name,
        customer_mobile: bookingData.customer_mobile,
        work_location: bookingData.work_location,
        description: bookingData.description,
        booking_time: bookingData.booking_time,
        worker_id: workerId.toString(),
        timestamp: Date.now().toString(),
        work_type: bookingData.work_type,
        notification_title: '🚨 URGENT: New Booking Request!',
        notification_body: `${bookingData.customer_name} needs ${bookingData.work_type} at ${bookingData.work_location}`,
        fullscreen: 'true',
        continuous_vibration: 'true',
        priority: 'high',
        ttl: '3600',
        collapse_key: `booking_${bookingData.booking_id}`,
      },
      android: {
        priority: 'high',
        notification: {
          title: '🚨 URGENT: New Booking Request!',
          body: `${bookingData.customer_name} needs ${bookingData.work_type} at ${bookingData.work_location}`,
          channelId: 'booking-alerts',
          priority: 'max',
          visibility: 'public'
        },
        data: {
          type: 'booking_alert',
          booking_id: bookingData.booking_id,
          customer_name: bookingData.customer_name,
          customer_mobile: bookingData.customer_mobile,
          work_location: bookingData.work_location,
          description: bookingData.description,
          booking_time: bookingData.booking_time,
          worker_id: workerId.toString(),
          timestamp: Date.now().toString(),
          work_type: bookingData.work_type,
          notification_title: '🚨 URGENT: New Booking Request!',
          notification_body: `${bookingData.customer_name} needs ${bookingData.work_type} at ${bookingData.work_location}`,
          fullscreen: 'true',
          continuous_vibration: 'true',
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
            booking_id: bookingData.booking_id,
            customer_name: bookingData.customer_name,
            customer_mobile: bookingData.customer_mobile,
            work_location: bookingData.work_location,
            description: bookingData.description,
            booking_time: bookingData.booking_time,
            worker_id: workerId.toString(),
            timestamp: Date.now().toString(),
            notification_title: '🚨 URGENT: New Booking Request!',
            notification_body: `${bookingData.customer_name} needs ${bookingData.work_type} at ${bookingData.work_location}`,
          }
        }
      },
      token: fcmToken
    };

    console.log('🚨 Sending backend-style notification...');
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    console.log('📱 Check your device - should see fullscreen overlay or notification!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Get worker mobile from command line argument or use default
const workerMobile = process.argv[2] || '7799703461';
console.log(`🚀 Triggering notification for worker: ${workerMobile}`);
triggerBackendNotification(workerMobile);
