const mysql = require('mysql2/promise');

async function testRealBooking() {
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
    // Check if there are any pending bookings for worker 13
    const [bookings] = await pool.execute(
      'SELECT * FROM tbl_bookings WHERE worker_id = 13 AND status = 0 ORDER BY id DESC LIMIT 5'
    );

    console.log('📋 Recent bookings for worker 13:');
    if (bookings.length > 0) {
      bookings.forEach((booking, index) => {
        console.log(`${index + 1}. Booking ID: ${booking.id}`);
        console.log(`   Customer: ${booking.user_name || 'N/A'}`);
        console.log(`   Location: ${booking.work_location || 'N/A'}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Created: ${booking.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No pending bookings found for worker 13');
      console.log('📱 Create a booking to test notifications');
    }

    // Check worker details
    const [workers] = await pool.execute(
      'SELECT * FROM tbl_workers WHERE id = 13'
    );

    if (workers.length > 0) {
      console.log('👤 Worker 13 details:');
      console.log(`   Name: ${workers[0].name}`);
      console.log(`   Mobile: ${workers[0].mobile}`);
      console.log(`   Status: ${workers[0].status}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testRealBooking();
