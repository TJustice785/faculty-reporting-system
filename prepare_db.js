const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('\n=== Preparing Database ===');
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'faculty_reporting';

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    console.log(`Connecting to MySQL ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`✔ Database ensured: ${DB_NAME}`);

    // Check if tables exist
    const [tables] = await connection.query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?',
      [DB_NAME]
    );

    const hasTables = tables[0]?.count > 0;

    if (hasTables) {
      console.log(`✔ Database ${DB_NAME} already has ${tables[0].count} tables. Skipping import.`);
    } else {
      // Load schema file
      const schemaPath = path.join(__dirname, '..', 'database.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error(`✖ Schema file not found at ${schemaPath}`);
        process.exit(1);
      }
      let sql = fs.readFileSync(schemaPath, 'utf8');

      // Ensure it uses the selected database
      sql = sql.replace(/USE\s+\w+\s*;/i, `USE ${DB_NAME};`);

      console.log('Importing schema from database.sql ...');
      await connection.query(sql);
      console.log('✔ Schema import completed');
    }

    console.log('=== Database preparation complete ===\n');
    process.exit(0);
  } catch (err) {
    console.error('✖ Database preparation failed:', err.message);
    process.exit(1);
  } finally {
    try { await connection.end(); } catch {}
  }
})();
