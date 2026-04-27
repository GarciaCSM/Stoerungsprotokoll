# Stoerungsprotokoll Web Version

Eigenstaendige Web-Version im separaten Ordner, damit ihr sie spaeter in ein eigenes Repository pushen koennt.

## Schnellstart

1. In diesen Ordner wechseln:
   - `cd web-version`
2. Abhaengigkeiten installieren:
   - `npm install`
3. Dev-Server starten:
   - `npm run dev`

Standardmaessig nutzt die App `http://localhost:3001/api`.

## API URL anpassen

1. `.env.example` nach `.env` kopieren.
2. `VITE_API_BASE_URL` setzen, z. B.:
   - `VITE_API_BASE_URL=http://192.168.10.74:3001/api`

## In ein neues Repository auslagern

Variante A (nur diesen Ordner kopieren):

1. Ordner `web-version` in ein neues Verzeichnis kopieren.
2. Im kopierten Ordner:
   - `git init`
   - `git add .`
   - `git commit -m "Initial web version"`
   - `git remote add origin <dein-neues-repo-url>`
   - `git push -u origin main`

Variante B (spaeter per subtree/submodule) ist ebenfalls moeglich.

## Aktueller Umfang

- Grundlayout fuer Auswahlfelder
- API Health Check
- SOLL-Laden (`/api/soll-hours`)
- FA-Suche (`/api/search-fa`)

Die Struktur ist bewusst getrennt vorbereitet, damit ihr die Web-App unabhaengig vom Android-Projekt weiterentwickeln koennt.
