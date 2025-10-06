/**
 * Send notification to worker by mobile number
 * Usage: node scripts/send-notification-to-mobile.js [mobile_number]
 */

const API_BASE_URL = 'http://192.168.1.100:3000/api'; // Update this to your backend URL

async function findWorkerByMobile(mobile) {
  try {
    console.log(`🔍 Finding worker with mobile: ${mobile}`);
    
    const response = await fetch(`${API_BASE_URL}/workers/mobile/${mobile}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log(`✅ Found worker: ${result.data.name} (ID: ${result.data.id})`);
      return result.data;
    } else {
      console.log(`❌ Worker not found with mobile: ${mobile}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error finding worker:`, error.message);
    return null;
  }
}

async function sendBookingAlertToWorker(workerId, workerData) {
  try {
    console.log(`\n🚨 Sending booking alert to worker ${workerId} (${workerData.name}):`);
    
    // Create test booking data
    const testData = {
      booking_id: `TEST-${Date.now()}`,
      customer_name: 'Test Customer',
      customer_mobile: '9876543210',
      work_location: '123 Test Street, Test City',
      description: 'Urgent plumbing work needed - pipe burst!',
      booking_time: new Date(Date.now() + 30 * 60000).toISOString(), // 30 minutes from now
      work_type: 'Emergency Plumbing'
    };
    
    // Create a test booking first
    const bookingResponse = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booking_id: testData.booking_id,
        user_id: 999, // Test user ID
        worker_id: workerId,
        contact_number: testData.customer_mobile,
        work_location: testData.work_location,
        description: testData.description,
        booking_time: testData.booking_time,
        status: 0 // Pending
      })
    });

    if (!bookingResponse.ok) {
      throw new Error('Failed to create test booking');
    }

    const booking = await bookingResponse.json();
    
    if (booking.success) {
      console.log(`✅ Test booking created with ID: ${testData.booking_id}`);
      
      // Send Firebase push notification
      const notificationResponse = await fetch(`${API_BASE_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: workerId,
          user_type: 'professional', // For workers
          title: '🚨 URGENT: New Booking Request!',
          body: `${testData.customer_name} needs ${testData.work_type} at ${testData.work_location}`,
          data: {
            type: 'booking_alert',
            booking_id: testData.booking_id,
            customer_name: testData.customer_name,
            customer_mobile: testData.customer_mobile,
            work_location: testData.work_location,
            description: testData.description,
            booking_time: testData.booking_time,
            work_type: testData.work_type,
            fullscreen_notification: 'true'
          }
        })
      });

      const notificationResult = await notificationResponse.json();
      
      if (notificationResult.success) {
        console.log(`✅ Fullscreen notification sent successfully!`);
        console.log(`📱 Message ID: ${notificationResult.data.messageId}`);
        console.log(`📱 Fullscreen notification should appear on worker device now!`);
      } else {
        console.log(`❌ Failed to send notification: ${notificationResult.message}`);
      }
      
      return notificationResult;
    }
    
    return booking;
  } catch (error) {
    console.error(`❌ Error sending booking alert:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendNotificationToMobile(mobile) {
  try {
    console.log('🚀 Sending notification to worker by mobile number...\n');
    
    // Find worker by mobile number
    const worker = await findWorkerByMobile(mobile);
    
    if (!worker) {
      console.log(`❌ Cannot proceed - worker not found with mobile: ${mobile}`);
      return;
    }
    
    // Send booking alert notification
    await sendBookingAlertToWorker(worker.id, worker);
    
    console.log(`\n✅ Notification process completed!`);
    console.log(`📱 Check the worker's device (${mobile}) for fullscreen notification`);
    console.log(`🔧 Make sure the worker is using the WORKER APK build`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Get mobile number from command line arguments or use default
const mobileNumber = process.argv[2] || '7799703461';

console.log(`📱 Target Mobile Number: ${mobileNumber}`);
console.log(`🌐 Backend URL: ${API_BASE_URL}\n`);

// Run the notification
sendNotificationToMobile(mobileNumber).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
