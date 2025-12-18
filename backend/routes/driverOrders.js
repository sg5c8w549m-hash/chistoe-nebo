// backend/routes/driverOrders.js
const express = require('express');
const router = express.Router();

// Простейшая заглушка для водителей
router.get('/', (req, res) => {
  res.json({ message: 'Driver orders endpoint (stub)' });
});

module.exports = router;
