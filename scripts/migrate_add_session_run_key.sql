-- Migration: session_run_key fuer getrennte Produktionslaeufe pro Linie/Schicht/Datum
-- Ziel: Jeder Produktionsstart erzeugt eine eigene Session-Zeile

ALTER TABLE stprot_produktion_session
  ADD COLUMN IF NOT EXISTS session_run_key VARCHAR(32) NULL AFTER datum;

-- Bestehende Zeilen erhalten einen stabilen Run-Key aus timer_start_time/erstellt_am
UPDATE stprot_produktion_session
SET session_run_key = DATE_FORMAT(COALESCE(timer_start_time, erstellt_am), '%Y-%m-%d %H:%i:%s')
WHERE session_run_key IS NULL OR session_run_key = '';

-- Alte Eindeutigkeit loesen und neue pro Run-Key setzen
ALTER TABLE stprot_produktion_session DROP INDEX UQ_stprot_session;
ALTER TABLE stprot_produktion_session
  ADD UNIQUE KEY UQ_stprot_session (linie, schicht, datum, session_run_key);

-- Optional: Falls unbedingt NOT NULL gefordert ist
ALTER TABLE stprot_produktion_session
  MODIFY session_run_key VARCHAR(32) NOT NULL;
