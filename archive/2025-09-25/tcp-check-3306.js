const net = require('net');

const host = '127.0.0.1';
const port = 3306;
const timeoutMs = 4000;

console.log(`Probing TCP ${host}:${port} ...`);

const socket = new net.Socket();
let done = false;

socket.setTimeout(timeoutMs);

socket.on('connect', () => {
  done = true;
  console.log('TCP connect: SUCCESS');
  socket.destroy();
  process.exit(0);
});

socket.on('timeout', () => {
  if (done) return;
  done = true;
  console.error('TCP connect: TIMEOUT');
  socket.destroy();
  process.exit(2);
});

socket.on('error', (err) => {
  if (done) return;
  done = true;
  console.error('TCP connect: ERROR ->', err.code || err.message);
  process.exit(1);
});

socket.connect(port, host);
