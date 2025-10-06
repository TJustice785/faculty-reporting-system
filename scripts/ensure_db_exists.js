/*
 Ensure a target Postgres database exists (works with hyphens in name).
 Usage:
   node scripts/ensure_db_exists.js "faculty-reporting-system1"
 Reads admin connection from env (.env): DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
 Falls back to localhost/postgres.
*/
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const dbName = process.argv[2] || 'faculty-reporting-system1';
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';

  const admin = new Pool({ host, port, user, password, database: 'postgres', max: 1 });
  const quoteIdent = (name) => '"' + String(name).replace(/"/g, '""') + '"';

  const client = await admin.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE ${quoteIdent(dbName)} WITH ENCODING 'UTF8' TEMPLATE template0`);
      console.log(`Created database ${dbName}`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }
  } finally {
    client.release();
    await admin.end();
  }
})();
