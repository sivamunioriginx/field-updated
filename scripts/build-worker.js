#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Worker APK...');

// Copy worker app config to app.json
const workerConfig = fs.readFileSync('app-worker.json', 'utf8');
fs.writeFileSync('app.json', workerConfig);

console.log('✅ Worker app configuration applied');

// Build the worker APK
try {
  console.log('📱 Building worker APK with EAS...');
  execSync('eas build --platform android --profile worker', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Worker APK build completed successfully!');
} catch (error) {
  console.error('❌ Error building worker APK:', error.message);
  process.exit(1);
} finally {
  // Restore original app.json
  const originalConfig = fs.readFileSync('app.json.backup', 'utf8');
  fs.writeFileSync('app.json', originalConfig);
  console.log('🔄 Original app configuration restored');
}
