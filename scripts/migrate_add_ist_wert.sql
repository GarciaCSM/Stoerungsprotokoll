-- ============================================================
--  Migration: ist_wert zu stprot_produktion_session hinzufügen
--  Einmalig auf der IONOS MariaDB ausführen.
-- ============================================================

ALTER TABLE stprot_produktion_session
    ADD COLUMN IF NOT EXISTS ist_wert INT DEFAULT NULL
    COMMENT 'Letzter bekannter IST-Wert (Stückzahl) zum Zeitpunkt des Syncs';
