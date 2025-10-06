const mysql = require('mysql2/promise');

async function createBookingAndNotify() {
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
    // Create a test booking with status = 0 (pending)
    const bookingId = `AUTO_BOOKING_${Date.now()}`;
    const workerId = 13; // Your worker ID
    const userId = 1; // Test customer ID
    
    console.log('🚀 Creating test booking with status = 0...');
    
    const insertQuery = `
      INSERT INTO tbl_bookings (
        booking_id, worker_id, user_id, contact_number, work_location, booking_time, status, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const [result] = await pool.execute(insertQuery, [
      bookingId,
      workerId,
      userId,
      '9876543210',
      'Auto Test Location - Status 0 Booking',
      new Date().toISOString(),
      0, // Status = 0 (pending) - this will trigger notification
      'Automatic test booking with status 0'
    ]);
    
    console.log('✅ Booking created successfully!');
    console.log(`📋 Booking ID: ${bookingId}`);
    console.log(`👤 Worker ID: ${workerId}`);
    console.log(`📊 Status: 0 (pending)`);
    console.log('');
    console.log('🚨 The backend should automatically send notification to the worker!');
    console.log('📱 Check your device for the fullscreen notification with continuous vibration.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createBookingAndNotify();
