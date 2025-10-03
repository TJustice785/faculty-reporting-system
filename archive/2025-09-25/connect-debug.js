const mysql = require('mysql2');

const config = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'admin@123',
  // database intentionally omitted to isolate handshake
  connectTimeout: 5000,
  debug: true,
};

console.log('Creating mysql2 connection with debug...');
const conn = mysql.createConnection(config);

conn.on('error', (err) => {
  console.error('[conn error]', err && (err.code || err.message));
});

conn.connect((err) => {
  if (err) {
    console.error('connect callback error:', err.code, err.message);
    process.exit(1);
  }
  console.log('Connected. Running SELECT 1 ...');
  conn.query('SELECT 1 as ok, CURRENT_USER() as user', (qerr, rows) => {
    if (qerr) {
      console.error('query error:', qerr.code, qerr.message);
      conn.end();
      process.exit(2);
    }
    console.log('Rows:', rows);
    conn.end(() => {
      console.log('Connection ended.');
      process.exit(0);
    });
  });
});
