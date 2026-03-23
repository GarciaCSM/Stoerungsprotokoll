-- Migration: Bereich/Station in Session-Tabelle aufnehmen
-- Zweck: Station wird vom Client mitgesendet und pro Session gespeichert

ALTER TABLE stprot_produktion_session
  ADD COLUMN IF NOT EXISTS bereich VARCHAR(100) NULL AFTER schicht;
