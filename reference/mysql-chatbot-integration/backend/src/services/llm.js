import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const systemPrompt = `
You are a Norwegian assistant for a student internship portal.
Use tools only when needed.
Never invent database records.
If a required record is missing, say so clearly.
For write actions, be explicit about what was saved.
`;
