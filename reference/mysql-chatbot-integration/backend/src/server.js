import express from "express";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/chat", chatRouter);

app.listen(port, () => {
  console.log(`Reference backend listening on http://localhost:${port}`);
});
