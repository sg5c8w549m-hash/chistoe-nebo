// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Register (very basic — phone + password)
router.post('/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'phone and password required' });
    let user = await User.findOne({ phone });
    if (user) return res.status(400).json({ message: 'User exists' });

    user = new User({ phone, name });
    await user.setPassword(password);
    await user.save();

    const token = jwt.sign({ id: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isValid = await user.validatePassword(password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
