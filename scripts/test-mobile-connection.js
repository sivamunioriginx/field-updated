const http = require('http');
const { networkInterfaces } = require('os');

// Get local IP address
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const port = 3000;

console.log('🔍 Testing mobile device connectivity...');
console.log(`📱 Your computer's IP: ${localIP}`);
console.log(`🌐 Server URL: http://${localIP}:${port}`);
console.log('');

// Test if server is running
const testServer = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: localIP,
      port: port,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

// Run the test
testServer()
  .then((result) => {
    console.log('✅ Server is running and accessible!');
    console.log(`📊 Status: ${result.status}`);
    console.log(`📄 Response: ${result.data}`);
    console.log('');
    console.log('📱 To test on your mobile device:');
    console.log(`   1. Open your phone's browser`);
    console.log(`   2. Go to: http://${localIP}:${port}/api/health`);
    console.log(`   3. You should see a JSON response`);
    console.log('');
    console.log('🔧 If the test fails:');
    console.log('   1. Make sure your phone is on the same WiFi network');
    console.log('   2. Check Windows Firewall settings');
    console.log('   3. Try running: netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=3000');
  })
  .catch((error) => {
    console.log('❌ Server test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Make sure your backend server is running: npm run dev');
    console.log('   2. Check if the server is listening on 0.0.0.0:3000');
    console.log('   3. Verify Windows Firewall is not blocking port 3000');
  });
