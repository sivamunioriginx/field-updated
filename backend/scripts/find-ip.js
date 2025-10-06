const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        // Prefer WiFi/LAN addresses (usually start with 192.168.x.x or 10.0.x.x)
        if (interface.address.startsWith('192.168.') || interface.address.startsWith('10.0.')) {
          return interface.address;
        }
      }
    }
  }
  
  // Fallback to any non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIPAddress();
console.log('🌐 Your current IP address is:', ip);
console.log('📱 Update your constants/api.ts file with this IP address');
console.log('   Replace: http://192.168.31.84:3001/api');
console.log(`   With:    http://${ip}:3001/api`);
console.log('');
console.log('💡 Run this script whenever your IP address changes');
