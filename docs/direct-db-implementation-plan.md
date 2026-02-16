# Direkte DB-Verbindung aus React Native App - Implementierungsplan

## Ziel
- Direkte MSSQL/ODBC-Verbindung aus der React Native App (Android Tablet)
- Später: Ionos-Verbindung ebenfalls direkt aus der App

## Technische Optionen & Empfehlung

### Option 1: Native Android Module mit JDBC (EMPFOHLEN für intern)
**Vorteil:** Volle Kontrolle, funktioniert offline, direkte JDBC-Verbindung
**Nachteil:** Entwicklungsaufwand mittel-hoch, plattformspezifisch

#### Technischer Stack
- Java/Kotlin Native Module für React Native
- jTDS JDBC Driver (Microsoft SQL Server)
- React Native Bridge für JS ↔ Java Kommunikation

#### Implementierungsschritte
1. **Native Module erstellen** (android/app/src/main/java/...)
   - DatabaseModule.java mit JDBC-Verbindung
   - ConnectionManager für Connection Pooling
   - QueryExecutor für parametrisierte Queries

2. **jTDS Driver einbinden** (android/app/build.gradle)
   ```gradle
   dependencies {
       implementation 'net.sourceforge.jtds:jtds:1.3.1'
   }
   ```

3. **React Native Bridge** 
   - Registrierung des Native Modules
   - JavaScript-API erstellen (ersetzt FAService)

4. **Credentials Management**
   - Android Keystore für sensible Daten
   - Config-Datei für Connection-Strings (encrypted)
   - Nur LAN-Zugriff (Firewall-Regeln)

5. **Error Handling & Retry**
   - ConnectionTimeout, QueryTimeout
   - Retry-Mechanismus bei Netzwerkfehlern
   - Graceful Degradation

**Zeitaufwand:** 3-5 Arbeitstage (inkl. Testing)

---

### Option 2: Embedded Node Server (Hybrid - SCHNELLSTE Lösung)
**Vorteil:** Nutzt bestehenden Code, schnelle Umsetzung
**Nachteil:** Resource-Overhead durch Node-Prozess

#### Ansatz
- Node.js als Android-Service integrieren (nodejs-mobile-react-native)
- Dein bestehender server.js läuft embedded in der App
- App kommuniziert über localhost:3001

#### Implementierungsschritte
1. **nodejs-mobile-react-native installieren**
   ```bash
   npm install nodejs-mobile-react-native
   npx nodejs-mobile-react-native install
   ```

2. **Backend-Code in android/nodejs-assets/ kopieren**
   - server.js, api/, package.json
   - Dependencies bundlen

3. **Auto-Start beim App-Launch**
   - MainActivity.java erweitern
   - Node-Prozess im Hintergrund starten

4. **Existing FAService bleibt unverändert**
   - localhost:3001 wird automatisch verfügbar

**Zeitaufwand:** 1-2 Arbeitstage

---

### Option 3: SQLite Lokal + Cloud Sync (BESTE Langfrist-Lösung)
**Vorteil:** Offline-First, beste Performance, einfach für Ionos-Integration
**Nachteil:** Erfordert Sync-Logik, Datenmodell-Migration

#### Ansatz
- Lokale SQLite-DB auf dem Tablet (react-native-sqlite-storage)
- Periodischer Sync mit MSSQL (auf Server) und Ionos (Cloud API)
- Offline-fähig, keine Netzwerk-Abhängigkeit

**Zeitaufwand:** 5-7 Arbeitstage (inkl. Sync-Logik)

---

## Empfehlung für deine Situation

### Kurzfristig (JETZT - beste Balance):
**Option 2: Embedded Node Server**
- Schnellste Umsetzung (1-2 Tage)
- Nutzt bestehenden Code
- App startet Server automatisch beim Launch
- Keine Anpassungen an FAService nötig

### Mittelfristig (später, für Ionos):
**Option 3: SQLite + Cloud Sync**
- Beste Lösung für Offline + Cloud-Integration
- Ionos-API leicht integrierbar
- Professional Architecture

### Alternativ (wenn embedded Node zu "heavy"):
**Option 1: Native JDBC Module**
- Direkt, kein Overhead
- Aber: mehr Aufwand, nur für MSSQL optimiert
- Ionos später separat via HTTPS-API anbinden

---

## Nächste Schritte - WAS MÖCHTEST DU?

Sage mir eine der folgenden Optionen:

**A) Embedded Node (empfohlen, schnell)**
→ Ich implementiere nodejs-mobile-react-native, server.js startet automatisch, fertig in 1-2 Tagen

**B) Native JDBC Module**
→ Ich erstelle das Java Native Module + Bridge, 3-5 Tage Aufwand

**C) Hybrid: Embedded Node JETZT + später Migration zu SQLite+Sync**
→ Beste Roadmap: schneller Start, später saubere Architektur

Antworte mit **A**, **B** oder **C** — ich setze das dann direkt um.

---

## Wichtige Hinweise

### Sicherheit (intern OK, aber beachten)
- DB-Credentials in App → nur bei internem LAN akzeptabel
- Android Keystore verwenden für sensible Daten
- Ionos später über HTTPS + Auth-Token (sicherer)

### Testing
- Offline-Szenario testen
- Connection-Timeouts simulieren
- Mehrere Tablets gleichzeitig

### Firewall/Netzwerk
- MSSQL-Port nur im Firmen-LAN freigeben
- Ionos über HTTPS (Standard-Port 443)
