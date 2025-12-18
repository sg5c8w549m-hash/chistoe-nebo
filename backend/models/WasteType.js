// backend/models/WasteType.js
const mongoose = require('mongoose');

const WasteTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  skppCode: { type: String }, // для СКПП при наличии
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WasteType', WasteTypeSchema);
