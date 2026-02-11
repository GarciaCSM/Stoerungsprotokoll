const database = require('../config/database');

class FAKoepfeController {
  // Search FA-Koepfe by FANr
  async searchFA(req, res) {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({ success: true, results: [], count: 0 });
    }

    try {
      const sql = `
        SELECT TOP 20 
          FANr, 
          ArtikelNr, 
          Artikelbezeichnung, 
          Verarbeitungsstatus
        FROM dbo.FAKoepfe
        WHERE 
          Verarbeitungsstatus IN (30, 35, 36)
          AND CAST(FANr AS VARCHAR) LIKE ?
        ORDER BY FANr DESC
      `;

      const searchPattern = `%${query}%`;
      const result = await database.executeQuery(sql, [searchPattern]);

      res.json({ 
        success: true,
        results: result,
        count: result.length 
      });

    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Datenbankfehler beim Suchen',
        details: error.message 
      });
    }
  }

  // Get specific FA by FANr
  async getFAByNumber(req, res) {
    const { fanr } = req.params;

    try {
      const sql = `
        SELECT 
          FANr, 
          ArtikelNr, 
          Artikelbezeichnung, 
          Verarbeitungsstatus
        FROM dbo.FAKoepfe
        WHERE 
          FANr = ?
          AND Verarbeitungsstatus IN (30, 35, 36)
      `;

      const result = await database.executeQuery(sql, [fanr]);

      if (result.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'FA nicht gefunden oder Status ungültig (erlaubt: 30, 35, 36)' 
        });
      }

      res.json({ 
        success: true,
        data: result[0] 
      });

    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Datenbankfehler',
        details: error.message 
      });
    }
  }
}

module.exports = new FAKoepfeController();
