/*
 Transfer ownership of public schema tables, sequences, and functions to the app role.
 Uses admin connection (DB_ADMIN_USER/DB_ADMIN_PASSWORD) if provided; falls back to DB_USER.

 Usage:
   node scripts/transfer_pg_ownership.js
*/

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'faculty_reporting_system',
    DB_PASSWORD = '',
    DB_NAME = 'faculty-reporting-system1',
    DB_ADMIN_USER,
    DB_ADMIN_PASSWORD,
  } = process.env;

  const adminUser = DB_ADMIN_USER || 'postgres';
  const adminPassword = DB_ADMIN_PASSWORD || DB_PASSWORD;

  const dbPool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: adminUser,
    password: adminPassword,
    database: DB_NAME,
    max: 1,
  });

  const quoteIdent = (name) => '"' + String(name).replace(/"/g, '""') + '"';

  const client = await dbPool.connect();
  try {
    console.log(`Transferring ownership in database '${DB_NAME}' to role '${DB_USER}' using admin '${adminUser}'...`);

    // Transfer ownership of all tables in public
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    for (const t of tables) {
      const name = t.table_name;
      try {
        await client.query(`ALTER TABLE ${quoteIdent('public')}.${quoteIdent(name)} OWNER TO ${quoteIdent(DB_USER)};`);
        console.log(`  ✓ table: ${name}`);
      } catch (e) {
        console.log(`  ! table: ${name} -> ${e.message}`);
      }
    }

    // Transfer ownership of sequences
    const { rows: sequences } = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    for (const s of sequences) {
      const name = s.sequence_name;
      try {
        await client.query(`ALTER SEQUENCE ${quoteIdent('public')}.${quoteIdent(name)} OWNER TO ${quoteIdent(DB_USER)};`);
        console.log(`  ✓ sequence: ${name}`);
      } catch (e) {
        console.log(`  ! sequence: ${name} -> ${e.message}`);
      }
    }

    // Transfer ownership of views
    const { rows: views } = await client.query(`
      SELECT table_name as view_name
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);
    for (const v of views) {
      const name = v.view_name;
      try {
        await client.query(`ALTER VIEW ${quoteIdent('public')}.${quoteIdent(name)} OWNER TO ${quoteIdent(DB_USER)};`);
        console.log(`  ✓ view: ${name}`);
      } catch (e) {
        console.log(`  ! view: ${name} -> ${e.message}`);
      }
    }

    console.log('Ownership transfer complete.');
  } catch (err) {
    console.error('Ownership transfer failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await dbPool.end();
  }
})();
