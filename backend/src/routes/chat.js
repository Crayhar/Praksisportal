import express from "express";

const router = express.Router();
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

const proxyToOllama = (ollamaPath) => async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}${ollamaPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    response.body.pipeTo(new WritableStream({
      write(chunk) { res.write(chunk); },
      close() { res.end(); },
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post("/", proxyToOllama("/api/chat"));
router.post("/generate", proxyToOllama("/api/generate"));

export default router;
