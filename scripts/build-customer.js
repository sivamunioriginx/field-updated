#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Customer APK...');

// Copy customer app config to app.json
const customerConfig = fs.readFileSync('app-customer.json', 'utf8');
fs.writeFileSync('app.json', customerConfig);

console.log('✅ Customer app configuration applied');

// Build the customer APK
try {
  console.log('📱 Building customer APK with EAS...');
  execSync('eas build --platform android --profile customer', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Customer APK build completed successfully!');
} catch (error) {
  console.error('❌ Error building customer APK:', error.message);
  process.exit(1);
} finally {
  // Restore original app.json
  const originalConfig = fs.readFileSync('app.json.backup', 'utf8');
  fs.writeFileSync('app.json', originalConfig);
  console.log('🔄 Original app configuration restored');
}
