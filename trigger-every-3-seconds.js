const mysql = require('mysql2/promise');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./backend/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendSingleNotification() {
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
    // Get one pending booking for worker 13
    const [bookings] = await pool.execute(`
      SELECT 
        b.*,
        w.mobile as worker_mobile,
        w.name as worker_name
      FROM tbl_bookings b
      LEFT JOIN tbl_workers w ON b.worker_id = w.id
      WHERE b.status = 0 AND b.worker_id = 13
      ORDER BY b.id DESC
      LIMIT 1
    `);

    if (bookings.length === 0) {
      console.log('❌ No pending bookings found for worker 13');
      return;
    }

    const booking = bookings[0];
    console.log(`📋 Found booking: ${booking.booking_id}`);
    console.log(`   Worker: ${booking.worker_name} (${booking.worker_mobile})`);
    console.log(`   Location: ${booking.work_location}`);
    console.log(`   Contact: ${booking.contact_number}`);
    
    // Prepare booking data
    const bookingData = {
      booking_id: booking.booking_id,
      customer_name: 'Customer',
      customer_mobile: booking.contact_number || 'N/A',
      work_location: booking.work_location || 'Location not specified',
      description: booking.description || 'Service request',
      booking_time: booking.booking_time ? new Date(booking.booking_time).toISOString() : new Date().toISOString(),
      work_type: 'Service Request'
    };
    
    // Get worker's FCM token
    const [tokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_id = ? AND user_type = "worker" ORDER BY id DESC LIMIT 1',
      [13]
    );

    if (tokens.length === 0) {
      console.log('❌ No FCM token found for worker 13');
      return;
    }

    const fcmToken = tokens[0].fcm_token;
    console.log('📱 Using FCM token:', fcmToken.substring(0, 50) + '...');
    
    // Send notification
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
        worker_id: '13',
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
          worker_id: '13',
          timestamp: Date.now().toString(),
          work_type: bookingData.work_type,
          notification_title: '🚨 URGENT: New Booking Request!',
          notification_body: `${bookingData.customer_name} needs ${bookingData.work_type} at ${bookingData.work_location}`,
          fullscreen: 'true',
          continuous_vibration: 'true',
        }
      },
      token: fcmToken
    };

    console.log('🚨 Sending notification...');
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    console.log('📱 Check your device for the fullscreen notification!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Function to trigger notification every 3 seconds
function startPeriodicNotifications() {
  console.log('🚀 Starting periodic notifications every 3 seconds...');
  console.log('📱 Make sure your device is ready!');
  console.log('⏹️  Press Ctrl+C to stop');
  console.log('');
  
  let count = 0;
  
  const interval = setInterval(async () => {
    count++;
    console.log(`\n🔄 Notification attempt #${count}`);
    console.log(`⏰ ${new Date().toLocaleTimeString()}`);
    console.log('================================');
    
    await sendSingleNotification();
    
    console.log('================================');
    console.log('⏳ Waiting 3 seconds for next notification...');
  }, 3000);
  
  // Handle Ctrl+C to stop
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping periodic notifications...');
    clearInterval(interval);
    console.log('✅ Stopped successfully!');
    process.exit(0);
  });
}

// Start the periodic notifications
startPeriodicNotifications();
