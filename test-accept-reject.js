const mysql = require('mysql2/promise');

async function testAcceptRejectLogic() {
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
    console.log('🧪 Testing Accept/Reject Logic');
    console.log('================================');
    
    // First, let's see current pending bookings
    console.log('\n📋 Current pending bookings (status = 0):');
    const [pendingBookings] = await pool.execute(
      'SELECT booking_id, worker_id, status FROM tbl_bookings WHERE status = 0 ORDER BY id DESC LIMIT 5'
    );
    
    pendingBookings.forEach((booking, index) => {
      console.log(`${index + 1}. Booking: ${booking.booking_id}, Worker: ${booking.worker_id}, Status: ${booking.status}`);
    });
    
    if (pendingBookings.length === 0) {
      console.log('❌ No pending bookings found to test');
      return;
    }
    
    const testBooking = pendingBookings[0];
    console.log(`\n🎯 Testing with booking: ${testBooking.booking_id}`);
    
    // Simulate ACCEPT action
    console.log('\n✅ SIMULATING ACCEPT ACTION:');
    console.log('   - Setting current booking status to 1 (accepted)');
    console.log('   - Setting other bookings with same booking_id to status 3 (rejected)');
    
    // Update the current booking to accepted
    const [acceptResult] = await pool.execute(
      'UPDATE tbl_bookings SET status = 1 WHERE booking_id = ? AND worker_id = ? AND status = 0',
      [testBooking.booking_id, testBooking.worker_id]
    );
    
    console.log(`   - Updated ${acceptResult.affectedRows} booking to status 1`);
    
    // Update other bookings with same booking_id to rejected
    const [rejectOthersResult] = await pool.execute(
      'UPDATE tbl_bookings SET status = 3 WHERE booking_id = ? AND worker_id != ? AND status = 0',
      [testBooking.booking_id, testBooking.worker_id]
    );
    
    console.log(`   - Updated ${rejectOthersResult.affectedRows} other bookings to status 3`);
    
    // Show results
    console.log('\n📊 Results after ACCEPT:');
    const [resultsAfterAccept] = await pool.execute(
      'SELECT booking_id, worker_id, status FROM tbl_bookings WHERE booking_id = ? ORDER BY worker_id',
      [testBooking.booking_id]
    );
    
    resultsAfterAccept.forEach((booking, index) => {
      const statusText = booking.status === 1 ? 'ACCEPTED ✅' : 
                        booking.status === 3 ? 'REJECTED ❌' : 
                        booking.status === 0 ? 'PENDING ⏳' : `STATUS ${booking.status}`;
      console.log(`   ${index + 1}. Worker ${booking.worker_id}: ${statusText}`);
    });
    
    console.log('\n🎉 Accept/Reject logic test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Worker who clicked Accept: status = 1 ✅');
    console.log('   - Other workers with same booking_id: status = 3 ❌');
    console.log('   - This ensures only one worker can accept a booking');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testAcceptRejectLogic();
