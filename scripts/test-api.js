#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URLS = [
  'http://localhost:3000',
  'http://10.0.2.2:3000', // Android emulator
  'http://127.0.0.1:3000',
];

async function testConnection(baseUrl) {
  try {
    console.log(`Testing connection to: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS: ${baseUrl}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      return true;
    } else {
      console.log(`❌ FAILED: ${baseUrl} - Status: ${response.status}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${baseUrl} - ${error.message}\n`);
    return false;
  }
}

async function testAllConnections() {
  console.log('🔍 Testing API connectivity...\n');
  
  let successCount = 0;
  
  for (const baseUrl of BASE_URLS) {
    const success = await testConnection(baseUrl);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Results: ${successCount}/${BASE_URLS.length} connections successful`);
  
  if (successCount === 0) {
    console.log('\n❌ No connections successful. Make sure:');
    console.log('   1. Backend server is running (cd backend && npm run dev)');
    console.log('   2. MySQL database is connected');
    console.log('   3. Port 3000 is not blocked by firewall');
  } else {
    console.log('\n✅ Backend is accessible!');
  }
}

// Install node-fetch if not available
try {
  require('node-fetch');
  testAllConnections();
} catch (error) {
  console.log('Installing node-fetch for testing...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch', { stdio: 'inherit' });
  
  // Re-require after installation
  delete require.cache[require.resolve('node-fetch')];
  testAllConnections();
}