const express = require('express');
const router = express.Router();
const faKoepfeController = require('../controllers/faKoepfeController');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// FA-Koepfe routes
router.get('/search-fa', faKoepfeController.searchFA.bind(faKoepfeController));
router.get('/fa/:fanr', faKoepfeController.getFAByNumber.bind(faKoepfeController));

module.exports = router;
