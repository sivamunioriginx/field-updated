const mysql = require('mysql2/promise');

async function createTestBooking() {
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
    // Create a test booking for worker 13
    const bookingData = {
      booking_id: 'TEST_BOOKING_' + Date.now(),
      user_id: 1, // Assuming user ID 1 exists
      worker_id: 13, // Your worker
      contact_number: '1234567890',
      work_location: 'Test Location - Fullscreen Notification Test',
      booking_time: new Date(),
      status: 0, // Pending status
      description: 'Testing fullscreen notification system',
      work_documents: 'Test document',
      created_at: new Date()
    };

    const [result] = await pool.execute(
      `INSERT INTO tbl_bookings (booking_id, user_id, worker_id, contact_number, work_location, booking_time, status, description, work_documents, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingData.booking_id,
        bookingData.user_id,
        bookingData.worker_id,
        bookingData.contact_number,
        bookingData.work_location,
        bookingData.booking_time,
        bookingData.status,
        bookingData.description,
        bookingData.work_documents,
        bookingData.created_at
      ]
    );

    console.log('✅ Test booking created successfully!');
    console.log(`📋 Booking ID: ${bookingData.booking_id}`);
    console.log(`👤 Worker ID: ${bookingData.worker_id}`);
    console.log(`📍 Location: ${bookingData.work_location}`);
    console.log('');
    console.log('🚨 Now trigger the backend notification...');

    // Now trigger the backend notification function
    const bookingAlertData = {
      booking_id: bookingData.booking_id,
      customer_name: 'Test Customer',
      customer_mobile: bookingData.contact_number,
      work_location: bookingData.work_location,
      description: bookingData.description,
      booking_time: bookingData.booking_time.toISOString(),
      work_type: 'Test Service',
      price: '500',
      estimated_duration: '2 hours'
    };

    console.log('📤 Booking alert data prepared:');
    console.log(JSON.stringify(bookingAlertData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestBooking();
