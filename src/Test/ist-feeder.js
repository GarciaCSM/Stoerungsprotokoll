/*
  Test feeder script (run with Node)
  - Lives in: src/Test/ist-feeder.js
  - Usage: node src/Test/ist-feeder.js [--host=http://192.168.10.127:3001]
  - Press "a" (lower- or uppercase) in the console to increment IST by 1 (sends to server)
  - Press "r" to read current IST from server
  - Press "q" or Ctrl+C to quit
*/

const http = require('http');
const url = require('url');

const argvHost = process.argv.find(a => a.startsWith('--host='));
const HOST = argvHost ? argvHost.split('=')[1] : 'http://localhost:3001';
const API_BASE = `${HOST}/api`;
const POST_PATH = '/test/ist';
const GET_PATH = '/test/ist';

let ist = 0;

function doPostIst(value) {
  const body = JSON.stringify({ ist: value });
  const u = url.parse(API_BASE + POST_PATH);
  const opts = {
    hostname: u.hostname,
    port: u.port,
    path: u.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = http.request(opts, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const j = JSON.parse(data);
        console.log('Server replied:', j);
      } catch (e) {
        console.log('Server replied (raw):', data);
      }
    });
  });
  req.on('error', (err) => console.error('POST error:', err.message));
  req.write(body);
  req.end();
}

function doGetIst() {
  const u = url.parse(API_BASE + GET_PATH);
  http.get({ hostname: u.hostname, port: u.port, path: u.path }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { const j = JSON.parse(d); console.log('Current IST on server:', j.ist); } catch (e) { console.log('GET raw:', d); }
    });
  }).on('error', (err) => console.error('GET error:', err.message));
}

console.log('\nIST feeder started');
console.log('Host:', API_BASE);
console.log('Press "a" to increment IST, "r" to read current IST, "q" to quit.');

process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.on('data', (key) => {
  if (!key) return;
  const k = key.toString();
  if (k === '\u0003') { // ctrl-c
    process.exit();
  }
  if (k.toLowerCase() === 'a') {
    ist = Number(ist) + 1;
    console.log('Increment ->', ist);
    doPostIst(ist);
    return;
  }
  if (k.toLowerCase() === 'r') {
    doGetIst();
    return;
  }
  if (k.toLowerCase() === 'q') {
    console.log('Quitting');
    process.exit();
  }
});
