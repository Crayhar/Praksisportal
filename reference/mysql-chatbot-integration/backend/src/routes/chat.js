import express from "express";
import { pool } from "../db.js";
import { openai, systemPrompt } from "../services/llm.js";
import { toolDefinitions, executeToolCall } from "../services/chatTools.js";

export const chatRouter = express.Router();

chatRouter.post("/", async (req, res) => {
  const { message, sessionId } = req.body ?? {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A string message is required." });
  }

  try {
    const history = await loadChatHistory(sessionId);

    const input = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    const firstResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
      tools: toolDefinitions
    });

    const toolOutputs = [];

    for (const item of firstResponse.output || []) {
      if (item.type !== "function_call") {
        continue;
      }

      const args = JSON.parse(item.arguments || "{}");
      const result = await executeToolCall(item.name, args);

      toolOutputs.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(result)
      });
    }

    let finalText = extractText(firstResponse);

    if (toolOutputs.length > 0) {
      const secondResponse = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          ...input,
          { role: "assistant", content: extractText(firstResponse) || "Tool call requested." },
          ...toolOutputs
        ]
      });

      finalText = extractText(secondResponse);
    }

    const resolvedSessionId = await saveChatMessages(sessionId, message, finalText);

    return res.json({
      sessionId: resolvedSessionId,
      answer: finalText
    });
  } catch (error) {
    console.error("Chat route failed:", error);
    return res.status(500).json({ error: "Failed to process chat request." });
  }
});

async function loadChatHistory(sessionId) {
  if (!sessionId) {
    return [];
  }

  const [rows] = await pool.execute(
    `
      SELECT role, content
      FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [sessionId]
  );

  return rows.map((row) => ({
    role: row.role,
    content: row.content
  }));
}

async function saveChatMessages(sessionId, userMessage, assistantMessage) {
  let activeSessionId = sessionId;

  if (!activeSessionId) {
    const [sessionResult] = await pool.execute(
      `
        INSERT INTO chat_sessions ()
        VALUES ()
      `
    );
    activeSessionId = sessionResult.insertId;
  }

  await pool.execute(
    `
      INSERT INTO chat_messages (session_id, role, content)
      VALUES
        (?, 'user', ?),
        (?, 'assistant', ?)
    `,
    [activeSessionId, userMessage, activeSessionId, assistantMessage]
  );

  return activeSessionId;
}

function extractText(response) {
  if (!response?.output) {
    return "";
  }

  const textParts = [];

  for (const item of response.output) {
    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}
