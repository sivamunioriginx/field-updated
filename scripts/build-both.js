#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Both APKs...');

// Backup original app.json
const originalConfig = fs.readFileSync('app.json', 'utf8');
fs.writeFileSync('app.json.backup', originalConfig);

console.log('✅ Original app.json backed up');

// Build Customer APK
console.log('\n📱 Building Customer APK...');
try {
  const customerConfig = fs.readFileSync('app-customer.json', 'utf8');
  fs.writeFileSync('app.json', customerConfig);
  
  execSync('eas build --platform android --profile customer', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Customer APK build completed!');
} catch (error) {
  console.error('❌ Error building customer APK:', error.message);
  process.exit(1);
}

// Build Worker APK
console.log('\n📱 Building Worker APK...');
try {
  const workerConfig = fs.readFileSync('app-worker.json', 'utf8');
  fs.writeFileSync('app.json', workerConfig);
  
  execSync('eas build --platform android --profile worker', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Worker APK build completed!');
} catch (error) {
  console.error('❌ Error building worker APK:', error.message);
  process.exit(1);
}

// Restore original app.json
fs.writeFileSync('app.json', originalConfig);
console.log('\n🔄 Original app configuration restored');
console.log('🎉 Both APKs built successfully!');
