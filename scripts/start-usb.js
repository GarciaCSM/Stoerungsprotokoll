/**
 * USB-Dev: adb reverse + lokaler API-Server (IONOS-Proxy) + Expo.
 * Nutzung: npm run start:usb
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ADB_CANDIDATES = [
  process.env.ADB,
  'adb',
  process.platform === 'win32' ? 'C:\\platform-tools\\adb.exe' : null,
].filter(Boolean);

const REVERSE_PORTS = [19000, 19001, 8081, 3000, 3001, 5002, 5004, 5005];

function resolveAdb() {
  for (const cmd of ADB_CANDIDATES) {
    try {
      const r = spawnSync(cmd, ['version'], { stdio: 'pipe', encoding: 'utf8' });
      if (r.status === 0) return cmd;
    } catch (_) { /* next */ }
  }
  return null;
}

function adbReverse(adb) {
  const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' });
  const lines = String(devices.stdout || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('List of devices'));
  const authorized = lines.filter((l) => /\bdevice\b/.test(l));
  if (!authorized.length) {
    console.warn('[start:usb] Kein autorisiertes Gerät – adb reverse übersprungen.');
    console.warn('  USB-Debugging aktivieren und „Debugging zulassen“ am Tablet bestätigen.');
    return;
  }
  for (const p of REVERSE_PORTS) {
    const r = spawnSync(adb, ['reverse', `tcp:${p}`, `tcp:${p}`], { encoding: 'utf8' });
    if (r.status === 0) {
      console.log(`[start:usb] adb reverse tcp:${p} tcp:${p}`);
    } else {
      console.warn(`[start:usb] reverse tcp:${p} fehlgeschlagen`);
    }
  }
}

function startServer() {
  console.log('[start:usb] Starte Node-Server im Hintergrund (Port 3001, IONOS-Proxy) …');
  const proc = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  proc.unref();
  return proc;
}

function startExpo() {
  const proc = spawn('npx', ['expo', 'start'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  proc.on('exit', (code) => process.exit(code ?? 0));
}

const adb = resolveAdb();
if (adb) {
  adbReverse(adb);
} else {
  console.warn('[start:usb] adb nicht gefunden – nur Expo starten (IONOS-Proxy ggf. ohne Reverse).');
}

startServer();
setTimeout(() => {
  console.log('\n[start:usb] Expo starten … (IONOS im Dev-Modus über http://localhost:3001/ionos-proxy)\n');
  startExpo();
}, 2000);
