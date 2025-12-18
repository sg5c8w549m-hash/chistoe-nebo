import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== ВРЕМЕННОЕ ХРАНИЛИЩЕ (пока без MongoDB) =====
let orders = [];

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "chistoe-nebo-backend",
    time: new Date().toISOString(),
  });
});

// ===== ПОЛУЧИТЬ ВСЕ ЗАЯВКИ =====
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// ===== СОЗДАТЬ ЗАЯВКУ =====
app.post("/api/orders", (req, res) => {
  const {
    wasteType,
    subType,
    quantity,
    unit,
    address,
    desiredDateTime,
    comment,
    customer,
    driver,
    receivingOrg,
  } = req.body;

  if (!wasteType || !quantity || !address) {
    return res.status(400).json({
      error: "wasteType, quantity и address обязательны",
    });
  }

  const newOrder = {
    id: Date.now().toString(),
    wasteType,
    subType: subType || null,
    quantity,
    unit: unit || "kg",
    address,
    desiredDateTime: desiredDateTime || null,
    comment: comment || "",
    customer: customer || null,
    driver: driver || null,
    receivingOrg: receivingOrg || null,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);

  res.status(201).json(newOrder);
});

// ===== ИЗМЕНИТЬ СТАТУС =====
app.patch("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ error: "Заявка не найдена" });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  res.json(order);
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✅ Backend запущен на порту ${PORT}`);
});
