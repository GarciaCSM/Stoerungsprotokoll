const express = require('express');
const router = express.Router();
const faKoepfeController = require('../controllers/faKoepfeController');
const database = require('../config/database');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// DB health check (helps debug Render connectivity)
router.get('/health-db', async (req, res) => {
  try {
    // quick lightweight query
    const result = await database.executeQuery('SELECT 1 AS ok');
    res.json({ ok: true, db: true, result: Array.isArray(result) ? result[0] : result });
  } catch (err) {
    console.error('DB health check failed:', err.message || err);
    res.status(500).json({ ok: false, db: false, error: err.message || String(err) });
  }
});

// FA-Koepfe routes
router.get('/search-fa', faKoepfeController.searchFA.bind(faKoepfeController));
router.get('/fa/:fanr', faKoepfeController.getFAByNumber.bind(faKoepfeController));

module.exports = router;
