# Stoerungsprotokoll

React-Native/Expo-App zur Produktionsueberwachung mit Timer, Pause, Stoerungen, SOLL/IST und Session-Sync in MariaDB.

Diese README ist als Onboarding-Dokument gedacht: einmal lesen, dann sollte ein neuer Entwickler das Projekt lokal starten, verstehen und debuggen koennen.

## 1. Tech-Stack

- Frontend: React Native + Expo
- Lokales Backend: Node.js + Express + ODBC
- Persistenz: IONOS MariaDB ueber PHP-Endpunkte unter [php-api](php-api)
- Mobile-Sync: Tablet -> PHP Session/IST/Stoerungen
- Zusatz: PI-Testserver/Sensor-Simulator unter [src/Test](src/Test) (dies sind die echten Service-Implementierungen, die genutzt werden; keine weiteren externen Test-Tools nötig)

## 2. Projektaufbau

Wichtige Ordner und Einstiegsdateien:

- [App.js](App.js): App-Entry im Expo-Umfeld
- [server.js](server.js): Express-Server (lokale API)
- [api](api): Node-Controller + ODBC-DB-Layer
- [php-api](php-api): produktive PHP-Endpunkte fuer Session/IST/Stoerungen
- [src/screens/ProtocolScreen.js](src/screens/ProtocolScreen.js): Hauptlogik der Produktionsmaske
- [src/screens/protocol/hooks/useProductionTimer.js](src/screens/protocol/hooks/useProductionTimer.js): Timer/Pause/Stoerung-Status
- [src/screens/protocol/hooks/useDbSync.js](src/screens/protocol/hooks/useDbSync.js): DB-Sync (Session/Stoerungen laden/schreiben)
- [src/config/apiConfig.js](src/config/apiConfig.js): API-Basis-URLs
- [scripts/create_tables.sql](scripts/create_tables.sql): Full-Schema
- [scripts](scripts): Migrationen und Hilfsskripte

## 3. Voraussetzungen

- Node.js LTS (18/20 empfohlen)
- Android SDK + ADB (USB-Debugging am Tablet aktiv)
- Fuer Android-Build: JDK 17
- ODBC-Treiber + erreichbare metaARGON-Quelle (nur fuer Node-FA-Suche relevant)

Hinweis fuer Windows-Pfade:

- Umlaute im Projektpfad koennen bei Gradle Probleme verursachen.
- Falls Android-Release-Build scheitert, Projekt in einen ASCII-Pfad kopieren (z. B. `C:\Users\<user>\Stoerungsprotokoll`).

## 4. Lokales Setup

1. Dependencies installieren

```powershell
npm install
```

2. Environment anlegen (falls noch nicht vorhanden)

- Datei [.env](.env) mit mindestens:
	- `ODBC_CONNECTION_STRING=...`

3. Optional DB-Connectivity pruefen

```powershell
node test-db.js
```

## 5. Entwicklungsstart (Tablet ueber USB)

Empfohlener Weg fuer reales Tablet:

1. Terminal A: Metro + Port-Reverse

```powershell
npm run start:usb
```

Das Script setzt u. a. folgende ADB-Reverse-Rules:

- `tcp:19000`
- `tcp:19001`
- `tcp:3000`
- `tcp:3001`

2. Terminal B: Node-Server

```powershell
npm run server
```

Wenn `EADDRINUSE: 3001` erscheint, laeuft bereits ein Prozess auf dem Port. Dann den Prozess beenden oder den Port wechseln.

## 6. Wichtige NPM-Scripts

- `npm run start`: Expo Start (Dev Client)
- `npm run start:usb`: Expo Start + ADB reverse fuer Tablet
- `npm run server`: Express API starten
- `npm run server:dev`: Express API mit nodemon
- `npm run test:pi-server`: lokaler PI-Kontext-Testserver (in `src/Test/sensor-simulator.js` / `src/Test/pi-server.js` implementiert und produktiv genutzt)
- `npm run test:sensor`: Sensor-Simulator (in `src/Test/ist-feeder.js`, `src/Test/sensor-simulator.js`)
- `npm run test:ist` / `npm run test:ist-db`: IST-Testpfade

- !! Anmerkung es reicht beim PI 4 den pi-server zu starten. Dieser hat auch schon die GPIO Umsetzung. Im master-branch ist die veraltete Version vom pi-server

> Hinweis: Die `test`-Skripte bauen die echten Service-Flows, die in dieser App verwendet werden. Es gibt kein externes Zusatz-Modul für „Testdaten“; wir arbeiten direkt mit diesen implementierten Simulationen.

## 7. Datenfluss in kurz

1. Benutzer waehlt Linie/Schicht/Bereich + FA.
2. Timer startet in [useProductionTimer](src/screens/protocol/hooks/useProductionTimer.js).
3. [useDbSync](src/screens/protocol/hooks/useDbSync.js) synct Session-Status regelmaessig nach PHP.
4. PHP schreibt in `stprot_produktion_session`.
5. Stoerungen gehen nach Abschluss in `stprot_stoerungen`.
6. IST kommt ueber `ist.php` (Sensor/Server-Seite), nicht mehr vom Tablet in Session-POST.

## 8. Session-Verhalten (wichtig)

- Eine Produktion wird ueber `session_run_key` identifiziert.
- Pause/Fortsetzen darf keine neue Session erzeugen.
- Nach Schichtende wird Session auf inaktiv gesetzt; beim erneuten Auswaehlen derselben Schicht darf nicht automatisch die alte Session als aktiv geladen werden.
- Bereich/Station wird mitgespeichert und bei GET/DELETE im Session-Endpoint mitberuecksichtigt.

## 9. Datenbank: Schema und Migrationen

Neues System aufsetzen:

- [scripts/create_tables.sql](scripts/create_tables.sql)

Bestehende DB aktualisieren (je nach Stand):

- [scripts/migrate_add_ist_wert.sql](scripts/migrate_add_ist_wert.sql)
- [scripts/migrate_add_netto_seconds.sql](scripts/migrate_add_netto_seconds.sql)
- [scripts/migrate_add_session_run_key.sql](scripts/migrate_add_session_run_key.sql)
- [scripts/migrate_add_bereich_to_session.sql](scripts/migrate_add_bereich_to_session.sql)

## 10. Konfiguration

- API-URLs: [src/config/apiConfig.js](src/config/apiConfig.js)
	- `API_BASE_URL` fuer Node
	- `IONOS_API_BASE` fuer PHP
- ODBC/Server: [api/config/config.js](api/config/config.js)
- DB-Layer: [api/config/database.js](api/config/database.js)
- Stoerungstypen pro Linie: [src/config/lineButtonConfig.js](src/config/lineButtonConfig.js)

## 11. Troubleshooting

- Node-Server startet nicht (`EADDRINUSE 3001`):
	- Prozess auf Port 3001 beenden, dann `npm run server`.

- App erreicht Server nicht:
	- `npm run start:usb` nutzen.
	- `adb reverse --list` pruefen.
	- In [src/config/apiConfig.js](src/config/apiConfig.js) die korrekte Basis-URL sicherstellen.

- Android Release Build scheitert mit Java/Gradle:
	- JDK 17 verwenden.
	- Umlaute im Pfad vermeiden (ASCII-Pfad nutzen).

- Session wird unerwartet wiederhergestellt:
	- Session-GET-Filter in [php-api/session.php](php-api/session.php) pruefen.
	- Nach Schichtende muss `running/pause/stoerung/show_start_only` inaktiv sein.

## 12. Lizenz

Internes Projekt (nicht oeffentlich lizenziert).

## Bei fragen Kontakt mit Melih Iskender
