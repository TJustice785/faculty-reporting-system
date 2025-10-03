/*
 Apply PostgreSQL schema using node-postgres.
 Usage:
   node scripts/apply_pg_schema.js
 It uses environment variables from .env:
   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
*/
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'postgres',
    DB_PASSWORD = 'admin@123',
    DB_NAME = 'faculty_reporting_system',
    DB_ADMIN_USER,
    DB_ADMIN_PASSWORD,
  } = process.env;

  console.log('Resolved DB config from environment (.env overrides applied):');
  console.log(`  DB_HOST=${DB_HOST}`);
  console.log(`  DB_PORT=${DB_PORT}`);
  console.log(`  DB_USER=${DB_USER}`);
  console.log(`  DB_NAME=${DB_NAME}`);

  // Resolve admin creds (fallback to app creds if admin not provided)
  const adminUser = DB_ADMIN_USER || DB_USER;
  const adminPassword = DB_ADMIN_PASSWORD || DB_PASSWORD;

  // First connect to the default 'postgres' database to ensure target DB exists
  const adminPool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: adminUser,
    password: adminPassword,
    database: 'postgres',
    max: 1,
  });

  const sqlPath = path.join(__dirname, '..', 'database.pg.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`Schema file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Ensuring target database exists...');
  const adminClient = await adminPool.connect();
  try {
    const quoteIdent = (name) => '"' + String(name).replace(/"/g, '""') + '"';
    const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    if (rows.length === 0) {
      await adminClient.query(`CREATE DATABASE ${quoteIdent(DB_NAME)}`);
      console.log(`Created database '${DB_NAME}'.`);
    } else {
      console.log(`Database '${DB_NAME}' already exists.`);
    }
  } catch (err) {
    console.error('Failed while ensuring database:');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    adminClient.release();
    await adminPool.end();
  }

  // Now connect to the target DB and apply schema (admin user to ensure privileges)
  const pool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: adminUser,
    password: adminPassword,
    database: DB_NAME,
    max: 1,
  });

  console.log('Connecting to PostgreSQL target database...');
  const client = await pool.connect();
  try {
    console.log(`Connected. Applying schema to database '${DB_NAME}'...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to apply schema:');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
