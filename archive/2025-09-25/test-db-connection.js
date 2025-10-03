const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing database connection...');

    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin@123',
      connectTimeout: 5000,
    });

    console.log('✅ Connected to MySQL over TCP successfully!');

    // Simple test query without DB
    const [ping] = await connection.execute('SELECT 1 as ok, CURRENT_USER() as user');
    console.log('Ping result:', ping[0]);

    // If we want to use a DB next, try to switch to it explicitly
    const dbName = process.env.DB_NAME || 'faculty_reporting';
    try {
      await connection.query(`USE \`${dbName}\``);
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Found ${rows[0].count} users in database ${dbName}`);
    } catch (e) {
      console.log(`Note: could not query users table in '${dbName}':`, e.code || e.message);
    }

    await connection.end();
    console.log('🔌 Connection closed');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);

    // Common error solutions
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Solution: Check your username and password in .env file');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('\n💡 Solution: Make sure MySQL server is running and reachable on the configured host/port');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Solution: Create the database first using MySQL Workbench or run the schema');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  testConnection();
}
