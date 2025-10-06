#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📱 Setting up OriginX for Physical Device Testing\n');

// Step 1: Find IP address
console.log('🔍 Step 1: Finding your computer\'s IP address...');
try {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localIP = null;
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        if (interface.address.startsWith('192.168.') || 
            interface.address.startsWith('10.0.') ||
            interface.address.startsWith('172.')) {
          localIP = interface.address;
          console.log(`✅ Found IP: ${localIP}`);
          break;
        }
      }
    }
    if (localIP) break;
  }
  
  if (!localIP) {
    console.log('❌ No suitable local network IP found');
    console.log('   Make sure you\'re connected to WiFi');
    process.exit(1);
  }
  
  // Step 2: Update API configuration
  console.log('\n🔧 Step 2: Updating API configuration...');
  const apiConfigPath = path.join(__dirname, '../constants/api.ts');
  let apiConfig = fs.readFileSync(apiConfigPath, 'utf8');
  
  // Check if already configured for physical device
  if (apiConfig.includes(`http://${localIP}:3000/api`)) {
    console.log('✅ API already configured for physical device');
  } else {
    // Update the configuration
    const newConfig = apiConfig.replace(
      /\/\/ return 'http:\/\/192\.168\.1\.100:3000\/api'; \/\/ Replace with your actual IP/,
      `return 'http://${localIP}:3000/api'; // Physical device IP`
    );
    
    fs.writeFileSync(apiConfigPath, newConfig);
    console.log(`✅ Updated API configuration with IP: ${localIP}`);
  }
  
  // Step 3: Check backend setup
  console.log('\n🔧 Step 3: Checking backend setup...');
  const backendPath = path.join(__dirname, '../backend');
  if (!fs.existsSync(backendPath)) {
    console.log('❌ Backend directory not found');
    console.log('   Run: node scripts/setup-backend.js');
    process.exit(1);
  }
  
  // Step 4: Test backend connection
  console.log('\n🔧 Step 4: Testing backend connection...');
  try {
    const testScript = path.join(__dirname, 'test-api.js');
    if (fs.existsSync(testScript)) {
      execSync(`node ${testScript}`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.log('⚠️  Backend test failed. Make sure backend is running.');
  }
  
  // Step 5: Instructions
  console.log('\n📋 Step 5: Setup Instructions');
  console.log('================================');
  console.log('1. Start your backend server:');
  console.log('   cd backend && npm run dev');
  console.log('');
  console.log('2. Make sure your phone and computer are on the same WiFi network');
  console.log('');
  console.log('3. Start your React Native app:');
  console.log('   npm start');
  console.log('');
  console.log('4. Scan the QR code with Expo Go on your phone');
  console.log('');
  console.log('5. Test the registration form - it should now work!');
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('- If connection fails, check Windows Firewall settings');
  console.log('- Make sure port 3000 is not blocked');
  console.log('- Try disabling antivirus temporarily');
  console.log('- Ensure both devices are on the same WiFi network');
  console.log('');
  console.log('📱 Your app should now work on physical devices!');
  
} catch (error) {
  console.error('❌ Error during setup:', error.message);
  process.exit(1);
}
