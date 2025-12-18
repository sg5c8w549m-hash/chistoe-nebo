import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "chistoe-nebo-backend",
    time: new Date().toISOString(),
  });
});

app.use("/api/orders", ordersRouter);

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
