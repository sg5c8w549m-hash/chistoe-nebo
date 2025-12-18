const express = require("express");
const app = express();

const PORT = 5000;

// middleware
app.use(express.json());

// === HEALTHCHECK ===
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// === ROOT (чтобы не было Cannot GET /) ===
app.get("/", (req, res) => {
  res.send("Чистое Небо — backend работает 🚀");
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`✅ Backend запущен на порту ${PORT}`);
});
