const mysql = require('mysql2/promise');

async function getToken() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'originx_farm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [tokens] = await pool.execute(
      'SELECT pt.user_id, pt.fcm_token, w.mobile FROM tbl_push_tokens pt LEFT JOIN tbl_workers w ON pt.user_id = w.id WHERE pt.user_type = "worker" ORDER BY pt.id DESC'
    );

    if (tokens.length > 0) {
      console.log('📋 All worker FCM tokens:');
      tokens.forEach((token, index) => {
        console.log(`${index + 1}. Worker ID: ${token.user_id}, Mobile: ${token.mobile || 'N/A'}`);
        console.log(`   FCM Token: ${token.fcm_token ? token.fcm_token.substring(0, 50) + '...' : 'NULL'}`);
        console.log('');
      });
      
      // Check specifically for mobile 7799703461
      const targetWorker = tokens.find(t => t.mobile === '7799703461');
      if (targetWorker) {
        console.log('🎯 Found worker with mobile 7799703461:');
        console.log(`   Worker ID: ${targetWorker.user_id}`);
        console.log(`   FCM Token: ${targetWorker.fcm_token || 'NULL'}`);
        if (!targetWorker.fcm_token) {
          console.log('❌ This worker has NO FCM token!');
          console.log('📱 Worker needs to login again to register FCM token');
        }
      } else {
        console.log('❌ No worker found with mobile number 7799703461');
        console.log('📱 Make sure worker has logged into the app');
      }
    } else {
      console.log('❌ No worker tokens found');
      console.log('📱 Make sure a worker has logged into the app');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getToken();
