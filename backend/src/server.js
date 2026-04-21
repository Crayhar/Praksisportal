import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import casesRoutes from "./routes/cases.js";
import notificationRoutes from "./routes/notifications.js";
import chatRoutes from "./routes/chat.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

// Dedicated Ollama generate proxy — used by the frontend in production
// (VITE_OLLAMA_HOST points to this backend; frontend calls ${ollamaHost}/api/generate)
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
app.post("/api/generate", async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    response.body.pipeTo(
      new WritableStream({
        write(chunk) { res.write(chunk); },
        close() { res.end(); },
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
