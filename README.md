# Störungsprotokoll - Produktionsüberwachung

React Native App mit Node.js Backend für die Erfassung von Produktionsstörungen mit FA-Nummern-Integration aus der metaARGON Datenbank.

## 📁 Projektstruktur

```
Störungsprotkoll/
├── api/                           # Backend API
│   ├── config/
│   │   ├── config.js             # Server & CORS Konfiguration
│   │   └── database.js           # ODBC Datenbankverbindung
│   ├── controllers/
│   │   └── faKoepfeController.js # FA-Koepfe Geschäftslogik
│   └── routes/
│       └── index.js              # API Routen Definition
├── src/                          # React Native Frontend
│   ├── components/               # Wiederverwendbare UI-Komponenten
│   ├── config/
│   │   ├── apiConfig.js         # API URLs & Endpoints
│   │   └── lineButtonConfig.js  # Linien-Störungs-Konfiguration
│   ├── context/
│   │   └── ShiftContext.js      # Globaler Schicht-State
│   ├── screens/
│   │   ├── HomeScreen.js        # Start: Linien-/Schicht-Auswahl
│   │   └── ProtocolScreen.js    # Haupt: Timer & Störungserfassung
│   ├── services/
│   │   └── faService.js         # API-Client für FA-Suche
│   ├── styles/                   # StyleSheet Definitionen
│   └── utils/                    # Helper-Funktionen
├── .env                          # Umgebungsvariablen (nicht im Git)
├── server.js                     # Express Backend Entry Point
├── test-db.js                    # DB-Verbindungstest Script
└── package.json                  # Dependencies & Scripts
```

## 🚀 Schnellstart

```powershell
# 1. Dependencies installieren
npm install

# 2. Datenbankverbindung testen
node test-db.js

# 3. Optional: Php‑API auf IONOS deployen (kopiere php-api/*.php and config.php)
#    führe ggf. Migration aus:
#    mysql -u user -p dbname < scripts/migrate_add_ist_wert.sql

# 4. Backend starten (lokaler Node für Tests)
npm run server

# 5. Frontend starten (neues Terminal)
npm start
```

## 🔌 API Endpoints

### Node/Express (lokal)
- `GET /api/health` - Health Check
- `GET /api/search-fa?query=XXX` - FA-Nummern suchen
- `GET /api/fa/:fanr` - Spezifische FA-Details

> Die App synchronisiert alle 10 s den Timer und lädt beim Start oder Schichtwechsel
die Session + Störungen aus der Datenbank.

## 📱 Features

- ✅ Persistente Linienzuweisung pro Tablet
- ✅ Timer läuft auch bei geschlossener App
- ✅ Hybrid‑Sync: lokale und MariaDB-Session (Timer, FA, Pause, IST)
- ✅ SOLL‑Werte per Excel oder Server laden, pro FA
- ✅ SOLL‑Werte (pro Stunde und laufender Soll) werden jetzt auch in der Session‑DB mitgespeichert
- ✅ IST‑Zähler im Tablet + DB (über `ist.php`) – bleibt beim Neustart erhalten
- ✅ Per‑Schicht Timer‑State & FA, mit Schichtwechsel‑Bestätigung
- ✅ FA-Nummern-Suche in metaARGON DB (Status 30, 35, 36)
- ✅ Störungserfassung mit Zeittracking
- ✅ Lokale Logs & Statistiken
- ✅ DB-Wiederherstellung nach App‑Crash/Schichtwechsel

## 🛠️ Konfiguration

**Backend-URL ändern:**
`src/config/apiConfig.js` → `API_BASE_URL` (Node) und `IONOS_API_BASE` (PHP)

**ODBC-Verbindung:**
`.env` → `ODBC_CONNECTION_STRING`

**Störungstypen:**
`src/config/lineButtonConfig.js`

**SOLL‑Daten:**
Import per Excel‑Upload im Frontend oder via Node‑Script `npm run server` → PATCH `/api/soll-hours`.

**DB‑Erweiterung:**
Die Tabelle `stprot_produktion_session` enthält nun `soll_pro_stunde` und `soll_aktuell`; diese Werte werden bei jedem Sync im Feld `session.php` gespeichert und können von anderen Programmen abgefragt. Beim Schichtende landen sie zusätzlich in `stprot_schicht_abschluss`.

**IST‑Test:**
Lokaler Node: `npm run test:ist` oder DB‑Variante `npm run test:ist-db`.
## 📄 Lizenz

Internes Projekt
