const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { login, password } = req.body;

  if (login === 'admin' && password === 'admin') {
    return res.json({
      token: 'dev-token',
      user: { role: 'admin', name: 'Админ' },
    });
  }

  res.status(401).json({ message: 'Неверные данные' });
});

module.exports = router;
