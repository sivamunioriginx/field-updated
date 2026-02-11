#!/usr/bin/env node

/**
 * Build APKs for sharing with friends using ngrok
 * This script helps automate the process of updating API URLs and building APKs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚀 Build APKs for Sharing\n');
  console.log('This script will help you build APKs that your friends can use with your local backend.\n');

  // Step 1: Check if ngrok is running
  console.log('📋 Step 1: ngrok URL');
  console.log('Make sure ngrok is running in another terminal: ngrok http 3001\n');

  const ngrokUrl = await question('Enter your ngrok URL (e.g., https://abc123xyz.ngrok.io): ');
  
  if (!ngrokUrl.startsWith('http')) {
    console.error('❌ Error: URL must start with http:// or https://');
    rl.close();
    process.exit(1);
  }

  // Remove trailing slash if present
  const cleanUrl = ngrokUrl.replace(/\/$/, '');

  console.log(`\n✅ Using URL: ${cleanUrl}`);

  // Step 2: Update api.ts
  console.log('\n📝 Step 2: Updating constants/api.ts...');

  const apiTsPath = path.join(__dirname, '..', 'constants', 'api.ts');
  let apiContent = fs.readFileSync(apiTsPath, 'utf8');

  // Extract current base URL from the file for fallback
  const urlMatch = apiContent.match(/return\s+['"](https?:\/\/[^'"]+)['"]/);
  let currentBaseUrl = urlMatch ? urlMatch[1] : 'http://192.168.31.84:3001/api';
  if (urlMatch && urlMatch[1].includes('ngrok')) {
    // If ngrok URL found, look for the next URL (physical device IP)
    const allMatches = apiContent.matchAll(/return\s+['"](https?:\/\/[^'"]+)['"]/g);
    for (const match of allMatches) {
      if (!match[1].includes('ngrok')) {
        currentBaseUrl = match[1];
        break;
      }
    }
  }

  // Update the getBaseUrl function
  const updatedApiContent = apiContent.replace(
    /const getBaseUrl = \(\) => \{[\s\S]*?\};/,
    `const getBaseUrl = () => {
  if (!__DEV__) {
    // ngrok URL for sharing APKs with friends
    return '${cleanUrl}/api';
  }
  
  // For local development on physical devices
  return '${currentBaseUrl}';
};`
  );

  fs.writeFileSync(apiTsPath, updatedApiContent, 'utf8');
  console.log('✅ Updated API configuration');

  // Step 3: Build APKs
  console.log('\n🔨 Step 3: Building APKs...');
  console.log('This may take several minutes...\n');

  const buildBoth = await question('Build both Customer and Worker APKs? (y/n): ');

  try {
    if (buildBoth.toLowerCase() === 'y') {
      console.log('\n📱 Building Customer APK...');
      execSync('node scripts/build-customer.js', { stdio: 'inherit' });

      console.log('\n👷 Building Worker APK...');
      execSync('node scripts/build-worker.js', { stdio: 'inherit' });

      console.log('\n✅ Both APKs built successfully!');
      console.log('\n📦 APK Locations:');
      console.log('   - Customer: android/app/build/outputs/apk/release/app-release.apk');
      console.log('   - Worker: android/app/build/outputs/apk/release/app-release.apk');
      console.log('\n💡 Tip: Rename them before sharing!');
      console.log('   - field-service-customer.apk');
      console.log('   - field-service-worker.apk');
    } else {
      const appType = await question('Which APK to build? (customer/worker): ');
      
      if (appType.toLowerCase() === 'customer') {
        console.log('\n📱 Building Customer APK...');
        execSync('node scripts/build-customer.js', { stdio: 'inherit' });
      } else if (appType.toLowerCase() === 'worker') {
        console.log('\n👷 Building Worker APK...');
        execSync('node scripts/build-worker.js', { stdio: 'inherit' });
      } else {
        console.error('❌ Invalid option. Please choose customer or worker.');
        rl.close();
        process.exit(1);
      }

      console.log('\n✅ APK built successfully!');
      console.log('\n📦 APK Location: android/app/build/outputs/apk/release/app-release.apk');
    }

    // Step 4: Final instructions
    console.log('\n\n🎉 Build Complete!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Find the APK files in android/app/build/outputs/apk/release/');
    console.log('   2. Rename them appropriately (customer/worker)');
    console.log('   3. Send to your friend via WhatsApp, Drive, etc.');
    console.log('   4. ⚠️  IMPORTANT: Keep your computer ON with backend and ngrok running!');
    console.log('   5. Test the APK on your phone first (using mobile data, not WiFi)');
    
    console.log('\n🔗 Your ngrok URL: ' + cleanUrl);
    console.log('⚠️  Remember: If you restart ngrok, the URL will change and you\'ll need to rebuild!');

    console.log('\n💡 Tip: Test backend health endpoint in browser:');
    console.log('   ' + cleanUrl + '/api/health');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   1. Make sure backend is running: cd backend && npm start');
    console.error('   2. Check if ngrok is running: ngrok http 3001');
    console.error('   3. Verify Android development environment is set up');
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

