-- Migration: netto_seconds Spalte zur Session-Tabelle hinzufügen
-- Ausführen auf dem IONOS MariaDB-Server

ALTER TABLE stprot_produktion_session
  ADD COLUMN IF NOT EXISTS netto_seconds INT DEFAULT 0 AFTER pause_total_seconds;
