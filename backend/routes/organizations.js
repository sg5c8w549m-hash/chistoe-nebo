const express = require("express");
const Organization = require("../models/Organization");
const router = express.Router();

// Создать организацию
router.post("/", async (req, res) => {
  try {
    const org = await Organization.create(req.body);
    res.status(201).json(org);
  } catch (err) {
    console.error("org create error:", err);
    res.status(500).json({ message: "Ошибка создания организации" });
  }
});

// Все организации
router.get("/", async (req, res) => {
  const list = await Organization.find().sort({ createdAt: -1 });
  res.json(list);
});

module.exports = router;
