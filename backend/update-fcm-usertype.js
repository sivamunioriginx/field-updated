const mysql = require('mysql2/promise');

async function updateFCMUserTypes() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'originx_farm'
  });

  try {
    console.log('🔄 Updating FCM token user types...');
    
    // Update the real FCM token for worker 13 to have user_type = 'worker'
    const [updateResult] = await pool.execute(
      'UPDATE tbl_push_tokens SET user_type = "worker" WHERE user_id = 13 AND fcm_token LIKE "ddF17Pw_%"'
    );
    
    console.log(`✅ Updated ${updateResult.affectedRows} FCM token(s) for worker 13`);
    
    // Check the current state
    const [result] = await pool.execute(
      'SELECT user_id, user_type, LEFT(fcm_token, 50) as token_preview FROM tbl_push_tokens WHERE user_id = 13 AND fcm_token LIKE "ddF17Pw_%"'
    );
    
    console.log('📱 Current FCM token state:', result);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
  
  process.exit(0);
}

updateFCMUserTypes();
