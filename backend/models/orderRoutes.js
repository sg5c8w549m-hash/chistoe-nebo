// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/orders — список всех заявок
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: 1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders', err);
    res.status(500).json({ message: 'Server error while getting orders' });
  }
});

// POST /api/orders — создание новой заявки
router.post('/', async (req, res) => {
  try {
    const { wasteType, quantity, address, preferredDate, comment } = req.body;

    if (!wasteType || !quantity || !address) {
      return res.status(400).json({ message: 'wasteType, quantity и address обязательны' });
    }

    const order = new Order({
      wasteType,
      quantity,
      address,
      preferredDate,
      comment,
      status: 'new',
    });

    const saved = await order.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating order', err);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

module.exports = router;
