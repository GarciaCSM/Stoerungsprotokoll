/**
 * Tötet den Prozess der auf Port 3001 lauscht (falls vorhanden).
 * Wird als "preserver" npm-Hook automatisch vor "npm run server" und
 * "npm run server:dev" ausgeführt.
 */
const { execSync } = require('child_process');
// default port must match the API_CONFIG default above
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

try {
  const out = execSync('netstat -ano').toString();
  const stateRegex = /(ABH|LISTEN|LISTENING)/i;
  const line = out.split('\n').find(
    l => l.includes(`:${PORT}`) && stateRegex.test(l)
  );
  if (line) {
    const pid = line.trim().split(/\s+/).pop();
    execSync(`taskkill /F /PID ${pid}`);
    console.log(`[kill-port] Prozess ${pid} auf Port ${PORT} beendet.`);
  }
} catch (e) {
  // kein Prozess auf dem Port – alles OK
}
