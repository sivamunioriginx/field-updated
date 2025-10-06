const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Android development environment...\n');

// Check if ANDROID_HOME is set
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!androidHome) {
  console.log('❌ ANDROID_HOME or ANDROID_SDK_ROOT environment variable is not set.');
  console.log('Please set one of these environment variables to your Android SDK path.');
  console.log('Example: ANDROID_HOME=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk');
  process.exit(1);
}

console.log(`✅ Android SDK found at: ${androidHome}`);

// Check if adb is available
try {
  const adbPath = path.join(androidHome, 'platform-tools', 'adb.exe');
  if (fs.existsSync(adbPath)) {
    console.log('✅ ADB found');
  } else {
    console.log('❌ ADB not found. Please install Android SDK Platform Tools.');
  }
} catch (error) {
  console.log('❌ Error checking ADB:', error.message);
}

// Check if emulator is available
try {
  const emulatorPath = path.join(androidHome, 'emulator', 'emulator.exe');
  if (fs.existsSync(emulatorPath)) {
    console.log('✅ Android Emulator found');
  } else {
    console.log('❌ Android Emulator not found. Please install Android SDK Emulator.');
  }
} catch (error) {
  console.log('❌ Error checking emulator:', error.message);
}

console.log('\n📋 Next steps:');
console.log('1. Make sure you have an Android emulator running');
console.log('2. Run: npx expo start');
console.log('3. Press "a" to run on Android');
console.log('4. Or run: npx expo run:android'); 