const axios = require('axios');

async function testAutomaticNotification() {
  try {
    console.log('🚀 Testing automatic notification system...');
    console.log('📡 Backend server should be running on port 3001');
    
    // Create a booking with status = 0 via the backend API
    const bookingData = {
      booking_id: `AUTO_API_BOOKING_${Date.now()}`,
      worker_id: 13, // Your worker ID
      user_id: 1,
      contact_number: '9876543210',
      work_location: 'Test Location - Automatic API Notification',
      booking_time: new Date().toISOString(),
      status: 0, // This should trigger automatic notification
      description: 'Testing automatic notification via API'
    };
    
    console.log('📋 Creating booking via backend API...');
    console.log(`   Booking ID: ${bookingData.booking_id}`);
    console.log(`   Worker ID: ${bookingData.worker_id}`);
    console.log(`   Status: ${bookingData.status} (should trigger notification)`);
    
    const response = await axios.post('http://localhost:3001/api/bookings', bookingData);
    
    console.log('✅ Booking created successfully!');
    console.log('📊 Response:', response.data);
    
    if (response.data.success) {
      console.log('🚨 Backend should have automatically sent notification to worker!');
      console.log('📱 Check your device for the fullscreen notification with continuous vibration.');
      console.log('');
      console.log('🎯 Expected behavior:');
      console.log('   - Fullscreen overlay appears');
      console.log('   - Continuous vibration starts');
      console.log('   - Only Accept/Reject buttons visible');
      console.log('   - Click Accept → status becomes 1, others become 3');
      console.log('   - Click Reject → status becomes 3');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 Backend server is not running!');
      console.log('   Please start the backend server:');
      console.log('   cd backend && node server.js');
    }
  }
}

testAutomaticNotification();
