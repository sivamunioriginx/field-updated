const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

// Read BASE_URL from constants/api.ts
function getBaseUrl() {
  const apiTsPath = path.join(__dirname, '..', 'constants', 'api.ts');
  const apiContent = fs.readFileSync(apiTsPath, 'utf8');
  
  // Extract BASE_URL which is defined as: export const BASE_URL = API_BASE_URL.replace('/api', '');
  // We need to get the URL and remove /api suffix
  const urlMatch = apiContent.match(/return\s+['"](https?:\/\/[^'"]+)['"]/);
  if (urlMatch) {
    return urlMatch[1].replace('/api', '');
  }
  
  throw new Error('Could not read BASE_URL from constants/api.ts');
}

const BASE_URL = getBaseUrl();
const API_BASE_URL = `${BASE_URL}/api`;

async function sendBookingAlert() {
  try {
    console.log('🚨 Sending booking alert to worker with mobile 7799703461...');
    
    const response = await fetch(`${API_BASE_URL}/send-manual-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        worker_mobile: '7799703461',
        customer_name: 'Test Customer',
        customer_mobile: '9876543210',
        work_location: '123 Test Street, Test City',
        description: 'Urgent plumbing work needed - pipe burst!',
        booking_time: new Date().toISOString()
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Booking alert sent successfully!');
      console.log('📱 Response:', result);
    } else {
      console.error('❌ Failed to send booking alert:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error sending booking alert:', error.message);
  }
}

// Run the test
sendBookingAlert();
