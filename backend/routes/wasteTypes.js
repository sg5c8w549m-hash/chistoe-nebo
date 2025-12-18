// backend/routes/wasteTypes.js
const express = require('express');
const WasteType = require('../models/WasteType');

const router = express.Router();

// GET all
router.get('/', async (req, res) => {
  const list = await WasteType.find().sort({ name: 1 });
  res.json(list);
});

// GET by id
router.get('/:id', async (req, res) => {
  const w = await WasteType.findById(req.params.id);
  if(!w) return res.status(404).json({message: 'Not found'});
  res.json(w);
});

// POST create
router.post('/', async (req, res) => {
  const { name, description, skppCode } = req.body;
  const w = new WasteType({ name, description, skppCode });
  await w.save();
  res.status(201).json(w);
});

// PUT update
router.put('/:id', async (req, res) => {
  const w = await WasteType.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(w);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await WasteType.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
