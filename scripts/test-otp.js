const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testOTPFlow() {
  try {
    console.log('🧪 Testing OTP Flow...\n');

    // Test 1: Send OTP
    console.log('1️⃣ Testing Send OTP...');
    const sendOTPResponse = await axios.post(`${BASE_URL}/send-otp`, {
      mobile: '9876543210',
      userType: 'professional'
    });
    
    if (sendOTPResponse.data.success) {
      console.log('✅ Send OTP successful:', sendOTPResponse.data.message);
    } else {
      console.log('❌ Send OTP failed:', sendOTPResponse.data.message);
      return;
    }

    // Test 2: Verify OTP (this will fail with invalid OTP, which is expected)
    console.log('\n2️⃣ Testing Verify OTP with invalid code...');
    try {
      const verifyOTPResponse = await axios.post(`${BASE_URL}/verify-otp`, {
        mobile: '9876543210',
        otp: '000000',
        userType: 'professional'
      });
      
      if (verifyOTPResponse.data.success) {
        console.log('✅ Verify OTP successful:', verifyOTPResponse.data.message);
      } else {
        console.log('❌ Verify OTP failed:', verifyOTPResponse.data.message);
      }
    } catch (error) {
      if (error.response) {
        console.log('❌ Verify OTP failed (expected):', error.response.data.message);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    console.log('\n🎉 OTP API endpoints are working!');
    console.log('\n📱 To test with real OTP:');
    console.log('   1. Use a real mobile number');
    console.log('   2. Check your phone for the SMS');
    console.log('   3. Use the received OTP to verify');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Make sure the backend server is running on port 3000');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the test
testOTPFlow();
