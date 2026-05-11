const { loadSollMappingsFromEnv } = require('../services/sollFileService');

class SollController {
  // GET /api/soll-hours
  async getSollHours(req, res) {
    try {
      const { map, arbeitMap, source, count } = await loadSollMappingsFromEnv();
      res.json({ success: true, source, mapping: map, arbeitMapping: arbeitMap, count });
    } catch (err) {
      if (err.attemptedPath) {
        return res.status(404).json({
          success: false,
          error: err.message || 'SOLL-Datei nicht gefunden',
          attemptedPath: err.attemptedPath,
        });
      }
      console.error('Failed to read SOLL file:', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  }
}

module.exports = new SollController();
