const mysql = require('mysql2/promise');

async function checkFCMToken() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'originx_farm'
  });

  try {
    console.log('🔍 Checking FCM token for worker 13...');
    
    const [result] = await pool.execute(
      'SELECT user_id, user_type, LEFT(fcm_token, 50) as token_preview, LENGTH(fcm_token) as token_length FROM tbl_push_tokens WHERE user_id = 13 AND user_type = "professional"'
    );
    
    if (result.length > 0) {
      console.log('✅ FCM Token found:', result[0]);
    } else {
      console.log('❌ No FCM token found for worker 13');
      
      // Check if any tokens exist at all
      const [allTokens] = await pool.execute(
        'SELECT user_id, user_type, LEFT(fcm_token, 30) as preview FROM tbl_push_tokens LIMIT 5'
      );
      console.log('📱 All FCM tokens in database:', allTokens);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
  
  process.exit(0);
}

checkFCMToken();
