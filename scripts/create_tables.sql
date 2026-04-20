-- ============================================================
--  St�rungsprotokoll App    Datenbank-Schema
--  Pr�fix: stprot_
--  Datenbank: MariaDB (IONOS)
-- ============================================================


-- ============================================================
--  1. stprot_produktion_session
--     Eine aktive Session pro Linie + Schicht + Datum.
--     Wird vom Client per UPSERT alle paar Sekunden aktualisiert.
-- ============================================================
CREATE TABLE IF NOT EXISTS stprot_produktion_session (
    id                      INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Identifikator (zusammen UNIQUE)
    linie                   VARCHAR(50)     NOT NULL,
    schicht                 VARCHAR(50)     NOT NULL,
    bereich                 VARCHAR(100)    DEFAULT NULL,
    datum                   DATE            NOT NULL,
    session_run_key         VARCHAR(32)     NOT NULL,

    -- Zuordnung
    linienfuehrer           VARCHAR(100)    DEFAULT NULL,
    fa_nr                   VARCHAR(50)     DEFAULT NULL,
    artikel_nr              VARCHAR(50)     DEFAULT NULL,
    artikel_bezeichnung     VARCHAR(200)    DEFAULT NULL,

    -- Timer-Zustand
    timer_start_time        DATETIME        DEFAULT NULL,
    elapsed_seconds         INT             NOT NULL DEFAULT 0,
    running                 TINYINT(1)      NOT NULL DEFAULT 0,
    active_button           VARCHAR(20)     DEFAULT NULL,
    show_start_only         TINYINT(1)      NOT NULL DEFAULT 0,

    -- Pause-Zustand
    pause_running           TINYINT(1)      NOT NULL DEFAULT 0,
    pause_start_time        DATETIME        DEFAULT NULL,
    pause_total_seconds     INT             NOT NULL DEFAULT 0,

    -- Aktive St�rung (laufend, noch nicht abgeschlossen)
    stoerung_running        TINYINT(1)      NOT NULL DEFAULT 0,
    stoerung_start_time     DATETIME        DEFAULT NULL,
    stoerung_aktiv_typ      VARCHAR(200)    DEFAULT NULL,
    stoerung_aktiv_notiz    VARCHAR(500)    DEFAULT NULL,
    -- IST-Wert (letzter bekannter Stückzahl-Stand beim Sync)
    ist_wert                INT             DEFAULT NULL,
    -- SOLL‑Werte (pro Stunde und aktuell berechneter Erwartungswert)
    soll_pro_stunde         INT             DEFAULT NULL,
    soll_aktuell            INT             DEFAULT NULL,
    -- Zeitstempel
    erstellt_am             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aktualisiert_am         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY UQ_stprot_session (linie, schicht, datum, session_run_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  2. stprot_stoerungen
--     Jede abgeschlossene St�rung als eigene Zeile.
-- ============================================================
CREATE TABLE IF NOT EXISTS stprot_stoerungen (
    id                  INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,

    session_id          INT             DEFAULT NULL,
    linie               VARCHAR(50)     NOT NULL,
    linie_nummer        VARCHAR(10)     DEFAULT NULL,
    schicht             VARCHAR(50)     NOT NULL,
    bereich             VARCHAR(100)    DEFAULT NULL,
    datum               DATE            NOT NULL,

    linienfuehrer       VARCHAR(100)    DEFAULT NULL,
    fa_nr               VARCHAR(50)     DEFAULT NULL,

    stoerung_typ        VARCHAR(200)    NOT NULL,
    notiz               VARCHAR(500)    DEFAULT NULL,

    start_time          DATETIME        NOT NULL,
    end_time            DATETIME        NOT NULL,
    dauer_sekunden      INT             NOT NULL DEFAULT 0,

    erstellt_am         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY IX_stprot_stoerungen_linie_datum (linie, schicht, datum),
    CONSTRAINT FK_stprot_stoerungen_session
        FOREIGN KEY (session_id)
        REFERENCES stprot_produktion_session(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  3. stprot_soll_konfiguration
--     SOLL-Werte aus Excel je Artikel-Nr.
-- ============================================================
CREATE TABLE IF NOT EXISTS stprot_soll_konfiguration (
    id                  INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    artikel_nr          VARCHAR(50)     NOT NULL,
    stueck_pro_stunde   INT             DEFAULT NULL,
    kalk_ma             INT             DEFAULT NULL,
    quelle              VARCHAR(100)    DEFAULT NULL,
    aktualisiert_am     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY UQ_stprot_soll_artikel (artikel_nr)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  4. stprot_schicht_abschluss
--     Einmalig beim "Schicht beenden" geschrieben.
-- ============================================================
CREATE TABLE IF NOT EXISTS stprot_schicht_abschluss (
    id                      INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,

    session_id              INT             DEFAULT NULL,
    linie                   VARCHAR(50)     NOT NULL,
    schicht                 VARCHAR(50)     NOT NULL,
    datum                   DATE            NOT NULL,
    linienfuehrer           VARCHAR(100)    DEFAULT NULL,
    fa_nr                   VARCHAR(50)     DEFAULT NULL,
    artikel_nr              VARCHAR(50)     DEFAULT NULL,
    artikel_bezeichnung     VARCHAR(200)    DEFAULT NULL,

    timer_start_time        DATETIME        DEFAULT NULL,
    timer_ende_time         DATETIME        DEFAULT NULL,
    brutto_sekunden         INT             NOT NULL DEFAULT 0,
    pause_sekunden          INT             NOT NULL DEFAULT 0,
    stoerung_sekunden       INT             NOT NULL DEFAULT 0,
    netto_sekunden          INT             NOT NULL DEFAULT 0,

    anzahl_stoerungen       INT             NOT NULL DEFAULT 0,

    ist_menge               INT             DEFAULT NULL,
    soll_pro_stunde         INT             DEFAULT NULL,
    soll_aktuell            INT             DEFAULT NULL,
    anzahl_mitarbeiter      INT             DEFAULT NULL,

    abgeschlossen_am        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY UQ_stprot_abschluss (linie, schicht, datum),
    CONSTRAINT FK_stprot_abschluss_session
        FOREIGN KEY (session_id)
        REFERENCES stprot_produktion_session(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  Views
-- ============================================================

CREATE OR REPLACE VIEW stprot_v_sessions_heute AS
SELECT
    s.id,
    s.linie,
    s.schicht,
    s.bereich,
    s.datum,
    s.linienfuehrer,
    s.fa_nr,
    s.artikel_bezeichnung,
    s.elapsed_seconds,
    s.running,
    s.pause_total_seconds,
    s.stoerung_running,
    s.stoerung_aktiv_typ,
    s.aktualisiert_am,
    s.soll_pro_stunde,
    s.soll_aktuell,
    IFNULL(st.anzahl_stoerungen, 0)     AS anzahl_stoerungen_heute,
    IFNULL(st.stoerung_sekunden, 0)     AS stoerung_sekunden_heute
FROM stprot_produktion_session s
LEFT JOIN (
    SELECT
        session_id,
        COUNT(*)            AS anzahl_stoerungen,
        SUM(dauer_sekunden) AS stoerung_sekunden
    FROM stprot_stoerungen
    GROUP BY session_id
) st ON st.session_id = s.id
WHERE s.datum = CURDATE();


CREATE OR REPLACE VIEW stprot_v_stoerungen_uebersicht AS
SELECT
    linie,
    schicht,
    datum,
    stoerung_typ,
    COUNT(*)                AS anzahl,
    SUM(dauer_sekunden)     AS gesamt_sekunden,
    AVG(dauer_sekunden)     AS durchschnitt_sekunden,
    MIN(start_time)         AS erste_stoerung,
    MAX(end_time)           AS letzte_stoerung
FROM stprot_stoerungen
GROUP BY linie, schicht, datum, stoerung_typ;
