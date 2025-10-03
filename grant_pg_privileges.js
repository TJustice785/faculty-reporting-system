/*
 Grant privileges to the application role on the target database and schema.
 Uses admin connection (DB_ADMIN_USER/DB_ADMIN_PASSWORD) if provided, else DB_USER.
 Environment variables (from .env):
   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 Optional admin overrides:
   DB_ADMIN_USER, DB_ADMIN_PASSWORD
*/
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

(async () => {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'faculty_reporting_system', // app role to grant
    DB_PASSWORD = '',
    DB_NAME = 'faculty_reporting_system',
    DB_ADMIN_USER,
    DB_ADMIN_PASSWORD,
  } = process.env;

  const adminUser = DB_ADMIN_USER || 'postgres';
  const adminPassword = DB_ADMIN_PASSWORD || DB_PASSWORD; // if postgres trust local, password may be blank

  const adminPool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: adminUser,
    password: adminPassword,
    database: 'postgres',
    max: 1,
  });

  const quoteIdent = (name) => '"' + String(name).replace(/"/g, '""') + '"';

  const adminClient = await adminPool.connect();
  try {
    console.log(`Ensuring role '${DB_USER}' exists and granting privileges on database '${DB_NAME}' using admin '${adminUser}'...`);

    // Ensure application role exists
    const { rows: roleRows } = await adminClient.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [DB_USER]
    );
    if (roleRows.length === 0) {
      // Create role with LOGIN and password
      await adminClient.query(
        `CREATE ROLE ${quoteIdent(DB_USER)} LOGIN PASSWORD $1`,
        [DB_PASSWORD || '']
      );
      console.log(`Created role '${DB_USER}'.`);
    } else {
      console.log(`Role '${DB_USER}' already exists.`);
    }

    // Grant DB-level privileges
    await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(DB_NAME)} TO ${quoteIdent(DB_USER)};`);

    // Now connect to the target DB to grant schema/table default privileges
    const dbPool = new Pool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: adminUser,
      password: adminPassword,
      database: DB_NAME,
      max: 1,
    });

    const dbClient = await dbPool.connect();
    try {
      // Grant on schema public
      await dbClient.query(`GRANT ALL ON SCHEMA public TO ${quoteIdent(DB_USER)};`);

      // Grant on existing tables and sequences
      await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${quoteIdent(DB_USER)};`);
      await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdent(DB_USER)};`);

      // Set default privileges for future tables/sequences
      await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${quoteIdent(DB_USER)};`);
      await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${quoteIdent(DB_USER)};`);

      console.log('Privileges granted successfully.');
    } finally {
      dbClient.release();
      await dbPool.end();
    }
  } catch (err) {
    console.error('Failed to grant privileges:', err.message);
    process.exitCode = 1;
  } finally {
    adminClient.release();
    await adminPool.end();
  }
})();
