// backend/routes/orders.js
const express = require("express");
const Order = require("../models/Order");

const router = express.Router();

// Создать заявку
router.post("/", async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(order);
  } catch (err) {
    console.error("order create error:", err);
    res.status(500).json({ message: "Ошибка создания заявки" });
  }
});

// Все заявки
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("orders list error:", err);
    res.status(500).json({ message: "Ошибка загрузки заявок" });
  }
});

// Одна заявка по id
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }
    res.json(order);
  } catch (err) {
    console.error("order get error:", err);
    res.status(500).json({ message: "Ошибка загрузки заявки" });
  }
});

// Обновить статус / поля
router.put("/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!order) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }
    res.json(order);
  } catch (err) {
    console.error("order update error:", err);
    res.status(500).json({ message: "Ошибка обновления" });
  }
});

// Удалить
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }
    res.json({ message: "Удалено" });
  } catch (err) {
    console.error("order delete error:", err);
    res.status(500).json({ message: "Ошибка удаления" });
  }
});

module.exports = router;
