const express = require('express');
const router = express.Router();

// Тестовый маршрут для проверки подключения
router.get('/ping', (req, res) => res.json({ ok: true, route: 'auth ping' }));

module.exports = router;
