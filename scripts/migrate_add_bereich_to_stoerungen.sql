-- Migration: Bereich/Station in Stoerungen-Tabelle aufnehmen
-- Zweck: Stoerungen pro Station korrekt speichern/filtern

ALTER TABLE stprot_stoerungen
  ADD COLUMN IF NOT EXISTS bereich VARCHAR(100) NULL AFTER schicht;
