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

# 3. Backend starten (neues Terminal)
npm run server

# 4. Frontend starten (neues Terminal)
npm start
```

## 🔌 API Endpoints

- `GET /api/health` - Health Check
- `GET /api/search-fa?query=XXX` - FA-Nummern suchen
- `GET /api/fa/:fanr` - Spezifische FA-Details

## 📱 Features

- ✅ Persistente Linienzuweisung pro Tablet
- ✅ Timer läuft auch bei geschlossener App
- ✅ FA-Nummern-Suche in metaARGON DB (Status 30, 35, 36)
- ✅ Störungserfassung mit Zeittracking
- ✅ Lokale Logs & Statistiken

## 🛠️ Konfiguration

**Backend-URL ändern:**
`src/config/apiConfig.js` → `API_BASE_URL`

**ODBC-Verbindung:**
`.env` → `ODBC_CONNECTION_STRING`

**Störungstypen:**
`src/config/lineButtonConfig.js`

## 📄 Lizenz

Internes Projekt
