/*
 Create or update an admin user.
 Usage examples:
   node scripts/create_admin_user.js --username admin --email admin@example.com --password My$tr0ngP@ss
   node scripts/create_admin_user.js --email you@example.com (prompts for missing fields)

 Reads DB connection from environment (.env):
   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME or DATABASE_URL
*/
const readline = require('readline');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
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

function ask(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (!hidden) return new Promise(res => rl.question(question, ans => { rl.close(); res(ans); }));
  // Hide input for password
  process.stdout.write(question);
  return new Promise(resolve => {
    const onData = (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
          break;
        default:
          process.stdout.write('*');
          input += char;
          break;
      }
    };
    let input = '';
    process.stdin.on('data', onData);
  });
}

(async () => {
  try {
    const args = parseArgs();
    const username = args.username || await ask('Username: ');
    const email = args.email || await ask('Email: ');
    const password = args.password || await ask('Password: ', true);

    if (!username || !email || !password) {
      console.error('username, email, and password are required.');
      process.exit(1);
    }

    const dbConfig = process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
    } : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faculty_reporting',
    };

    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Ensure email unique; upsert on email or username if present
      const upsertSql = `
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active)
        VALUES ($1, $2, $3, 'admin', 'System', 'Administrator', TRUE)
        ON CONFLICT (email)
        DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, role = 'admin', is_active = TRUE, updated_at = NOW()
        RETURNING id, email, role
      `;
      const { rows } = await client.query(upsertSql, [String(username).trim(), String(email).trim(), passwordHash]);

      // Also ensure username uniqueness if nullable unique index is present
      try {
        await client.query('UPDATE users SET username = $1 WHERE email = $2 AND (username IS NULL OR username <> $1)', [String(username).trim(), String(email).trim()]);
      } catch (_) { /* best-effort */ }

      await client.query('COMMIT');
      console.log('✅ Admin user ensured/updated:', rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('❌ Failed to create/update admin user:', err.message);
      process.exitCode = 1;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
