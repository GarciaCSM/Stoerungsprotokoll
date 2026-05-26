/**
 * Manueller IONOS-Sync (ODBC-FA + SOLL-Excel), ohne Serverstart.
 * Nutzt dieselben .env-Variablen wie SYNC_TO_IONOS_ON_START.
 *
 *   node scripts/sync-ionos-once.js
 */
require('dotenv').config();

const { runIonosSync } = require('../api/services/ionosSync');

runIonosSync({ silent: false })
  .then((r) => {
    console.log('Ergebnis:', JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
