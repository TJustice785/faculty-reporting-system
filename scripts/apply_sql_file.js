/*
 Apply an arbitrary SQL file to the configured PostgreSQL database.
 Usage:
   node scripts/apply_sql_file.js --file path/to/file.sql

 Reads DB connection from environment (.env):
   DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
*/
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = (args[i] || '').replace(/^--/, '');
    const val = args[i + 1];
    if (key) out[key] = val;
  }
  return out;
}

(async () => {
  const { file } = parseArgs();
  if (!file) {
    console.error('Usage: node scripts/apply_sql_file.js --file path/to/file.sql');
    process.exit(1);
  }

  const sqlPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const dbConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
      };

  console.log('Connecting to PostgreSQL...');
  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Applying SQL file: ${sqlPath}`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL applied successfully.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Failed to apply SQL file:');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
