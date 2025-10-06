const mysql = require('mysql2/promise');

async function checkTable() {
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
    const [columns] = await pool.execute('DESCRIBE tbl_bookings');
    
    console.log('📋 tbl_bookings columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
