import express from "express";
import Feedback from "../models/Feedback.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: "name and message required" });
    }

    const feedback = new Feedback({ name, message });
    await feedback.save();

    res.json({ status: "saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

export default router;
