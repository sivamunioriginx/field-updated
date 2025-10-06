/**
 * Test script for Worker Fullscreen Notifications
 * This script sends test notifications specifically to worker users to test the fullscreen notification feature
 */

const API_BASE_URL = 'http://192.168.1.100:3000/api'; // Update this to your backend URL

// Test scenarios for fullscreen notifications
const testScenarios = [
  {
    name: 'Urgent Plumbing Emergency',
    data: {
      title: '🚨 URGENT: Plumbing Emergency!',
      body: 'Emergency plumbing service needed immediately',
      booking_id: `URGENT_${Date.now()}`,
      customer_name: 'John Emergency',
      customer_mobile: '9876543210',
      work_location: '123 Emergency Street, Urgent City, 12345',
      description: 'Burst pipe in basement - water everywhere! Immediate assistance required.',
      booking_time: new Date(Date.now() + 30 * 60000).toLocaleString(), // 30 minutes from now
      work_type: 'Emergency Plumbing'
    }
  },
  {
    name: 'Electrical Emergency',
    data: {
      title: '⚡ HIGH PRIORITY: Electrical Issue',
      body: 'Power outage at commercial building',
      booking_id: `ELECTRICAL_${Date.now()}`,
      customer_name: 'Downtown Office Manager',
      customer_mobile: '9123456789',
      work_location: 'Downtown Office Complex, Business District',
      description: 'Complete power outage affecting 20+ offices. Generator backup failing.',
      booking_time: new Date(Date.now() + 45 * 60000).toLocaleString(), // 45 minutes from now
      work_type: 'Emergency Electrical'
    }
  },
  {
    name: 'HVAC Critical Failure',
    data: {
      title: '🌡️ CRITICAL: HVAC System Failure',
      body: 'Hospital HVAC system failure - immediate response needed',
      booking_id: `HVAC_${Date.now()}`,
      customer_name: 'City Hospital Maintenance',
      customer_mobile: '9555666777',
      work_location: 'City General Hospital, ICU Wing',
      description: 'HVAC system complete failure in ICU ward. Temperature rising rapidly.',
      booking_time: new Date(Date.now() + 20 * 60000).toLocaleString(), // 20 minutes from now
      work_type: 'Emergency HVAC'
    }
  }
];

/**
 * Send test notification to a specific worker
 */
async function sendTestNotificationToWorker(workerId, testData) {
  try {
    console.log(`\n🚨 Sending test notification to worker ${workerId}:`);
    console.log(`📋 Test: ${testData.name}`);
    console.log(`📱 Title: ${testData.data.title}`);
    
    const response = await fetch(`${API_BASE_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: workerId,
        user_type: 'professional', // For workers
        title: testData.data.title,
        body: testData.data.body,
        data: testData.data
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Test notification sent successfully!`);
      console.log(`📱 Message ID: ${result.data.messageId}`);
    } else {
      console.log(`❌ Failed to send test notification: ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error sending test notification:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send booking alert specifically (uses the special booking alert function)
 */
async function sendBookingAlertToWorker(workerId, testData) {
  try {
    console.log(`\n🚨 Sending booking alert to worker ${workerId}:`);
    console.log(`📋 Test: ${testData.name}`);
    
    // Create a test booking first
    const bookingResponse = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 999, // Test user ID
        worker_id: workerId,
        contact_number: testData.data.customer_mobile,
        work_location: testData.data.work_location,
        description: testData.data.description,
        booking_time: testData.data.booking_time,
        status: 0 // Pending
      })
    });

    if (!bookingResponse.ok) {
      throw new Error('Failed to create test booking');
    }

    const booking = await bookingResponse.json();
    
    if (booking.success) {
      console.log(`✅ Test booking created with ID: ${booking.bookingId}`);
      console.log(`📱 Fullscreen notification should appear on worker device now!`);
    }
    
    return booking;
  } catch (error) {
    console.error(`❌ Error sending booking alert:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runFullscreenNotificationTests() {
  console.log('🚀 Starting Worker Fullscreen Notification Tests...\n');
  
  // Get worker ID from command line arguments or use default
  const workerId = process.argv[2] || '1'; // Default to worker ID 1
  
  console.log(`👤 Testing with Worker ID: ${workerId}`);
  console.log(`🌐 Backend URL: ${API_BASE_URL}`);
  console.log(`📱 Testing fullscreen notifications for WORKER APK ONLY\n`);
  
  // Run each test scenario
  for (let i = 0; i < testScenarios.length; i++) {
    const testData = testScenarios[i];
    
    console.log(`\n--- TEST ${i + 1}/${testScenarios.length} ---`);
    
    // Method 1: Send as regular notification (will be handled by native service)
    await sendTestNotificationToWorker(workerId, testData);
    
    // Wait 5 seconds between tests
    if (i < testScenarios.length - 1) {
      console.log(`⏳ Waiting 5 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`\n✅ All fullscreen notification tests completed!`);
  console.log(`📱 Check your worker device for fullscreen notifications`);
  console.log(`🔧 Make sure you're testing on the WORKER APK build only`);
}

// Run the tests
if (require.main === module) {
  runFullscreenNotificationTests().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  sendTestNotificationToWorker,
  sendBookingAlertToWorker,
  testScenarios
};
