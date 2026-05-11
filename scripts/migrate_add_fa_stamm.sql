-- Stammliste FA aus ODBC-Spiegel für Suche/Anzeige auf IONOS
-- Einmalig auf MariaDB ausführen, dann fa_sync.php deployen.

CREATE TABLE IF NOT EXISTS stprot_fa_stamm (
    fanr                  VARCHAR(50)     NOT NULL,
    artikel_nr            VARCHAR(50)     DEFAULT NULL,
    artikel_bezeichnung   VARCHAR(500)    DEFAULT NULL,
    verarbeitungsstatus   INT             DEFAULT NULL,
    aktualisiert_am       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (fanr),
    KEY IX_stprot_fa_stamm_artikel (artikel_nr)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
