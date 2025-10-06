const mysql = require('mysql2/promise');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./backend/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Import the notification function from server.js
const sendBookingAlertNotification = async (workerId, bookingData) => {
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
    console.log(`🚨 Sending booking alert notification to worker: ${workerId}`);

    // Get worker's FCM token
    const [tokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_id = ? AND user_type = "worker" ORDER BY id DESC LIMIT 1',
      [workerId]
    );

    if (tokens.length === 0) {
      console.log(`❌ No FCM token found for worker: ${workerId}`);
      return { success: false, error: 'No FCM token found' };
    }

    const fcmToken = tokens[0].fcm_token;
    console.log(`🔍 Using token: ${fcmToken.substring(0, 50)}...`);
    
    if (!fcmToken) {
      console.log(`❌ Empty FCM token for worker: ${workerId}`);
      return { success: false, error: 'Empty FCM token' };
    }

    // Enhanced notification message with continuous vibration
    const message = {
      notification: {
        title: '🚨 URGENT: New Booking Request!',
        body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`
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
        work_type: bookingData.work_type || 'Service Request',
        notification_title: '🚨 URGENT: New Booking Request!',
        notification_body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
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
          body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
          channelId: 'booking-alerts',
          priority: 'max',
          visibility: 'public',
          tag: `booking_${bookingData.booking_id}`,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
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
          work_type: bookingData.work_type || 'Service Request',
          notification_title: '🚨 URGENT: New Booking Request!',
          notification_body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
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
            notification_body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
          }
        }
      },
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log('📱 Booking alert notification sent successfully:', response);
    return { success: true, messageId: response };

  } catch (error) {
    console.error('❌ Error sending booking alert notification:', error);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
};

async function notifyExistingPendingBookings() {
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
    console.log('🔍 Finding all pending bookings (status = 0)...');
    
    // Get all pending bookings with worker details
    const [bookings] = await pool.execute(`
      SELECT 
        b.*,
        w.mobile as worker_mobile,
        w.name as worker_name
      FROM tbl_bookings b
      LEFT JOIN tbl_workers w ON b.worker_id = w.id
      WHERE b.status = 0
      ORDER BY b.id DESC
    `);

    if (bookings.length === 0) {
      console.log('❌ No pending bookings found');
      return;
    }

    console.log(`📋 Found ${bookings.length} pending bookings:`);
    
    for (const booking of bookings) {
      console.log(`\n🚨 Processing booking: ${booking.booking_id}`);
      console.log(`   Worker ID: ${booking.worker_id} (${booking.worker_mobile})`);
      console.log(`   Customer Contact: ${booking.contact_number}`);
      console.log(`   Location: ${booking.work_location}`);
      
      // Prepare booking data
      const bookingData = {
        booking_id: booking.booking_id,
        customer_name: 'Customer', // We'll use generic customer name since we don't have customer table
        customer_mobile: booking.contact_number || 'N/A',
        work_location: booking.work_location || 'Location not specified',
        description: booking.description || 'Service request',
        booking_time: booking.booking_time ? booking.booking_time.toISOString() : new Date().toISOString(),
        work_type: 'Service Request'
      };
      
      // Send notification to worker
      const result = await sendBookingAlertNotification(booking.worker_id, bookingData);
      
      if (result.success) {
        console.log(`   ✅ Notification sent successfully to worker ${booking.worker_id}`);
      } else {
        console.log(`   ❌ Failed to send notification: ${result.error}`);
      }
    }
    
    console.log(`\n🎉 Completed processing ${bookings.length} pending bookings!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

notifyExistingPendingBookings();
