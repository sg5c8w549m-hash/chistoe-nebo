const express = require("express");
const User = require("../models/User");
const router = express.Router();

// — Простая регистрация/вход клиента
router.post("/client/login", async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Требуется номер телефона" });
    }

    // ищем существующего
    let user = await User.findOne({ phone });

    // если нет — создаём
    if (!user) {
      user = await User.create({
        phone,
        name: name || "Клиент",
        role: "client",
      });
    }

    res.json({
      userId: user._id,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });
  } catch (err) {
    console.error("client/login error:", err);
    res.status(500).json({ message: "Ошибка входа" });
  }
});

module.exports = router;
