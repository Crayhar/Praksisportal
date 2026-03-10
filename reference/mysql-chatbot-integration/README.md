# MySQL Chatbot Integration Reference

This folder is a standalone reference example. It does not change your existing React app.

It shows how you would normally connect a chatbot UI to:

- a backend API
- a MySQL database
- an LLM provider

The intended request flow is:

`React UI -> backend API -> MySQL + LLM -> React UI`

## Why This Architecture

Your current chatbot page is frontend-only. That is fine for UI testing, but it is not the right place to:

- store API keys
- store MySQL credentials
- run SQL queries
- decide what the AI is allowed to read or write

The backend should own all of that.

## Folder Overview

- `backend/`
  A sample Node.js + Express backend
- `backend/sql/schema.sql`
  Example MySQL tables
- `frontend/ChatbotApiExample.jsx`
  Example React component showing how the frontend would call the backend

## How The Chat Endpoint Works

The sample backend exposes:

- `POST /api/chat`

That route:

1. receives the user message
2. loads optional chat history from MySQL
3. asks the LLM whether it needs a safe tool
4. if needed, runs a predefined database action
5. sends the tool result back into the LLM
6. stores the assistant response in MySQL
7. returns the final answer to the frontend

## Important Design Rules

- Do not connect the browser directly to MySQL
- Do not expose API keys in React
- Do not let the model execute raw SQL
- Only allow predefined read/write operations
- Validate all write inputs
- Add authentication before using real student/company data

## Example Safe Tools

The backend example exposes only controlled operations:

- `listInternships`
- `getStudentProfile`
- `createChatNote`

That means the model can ask for those actions, but it cannot invent arbitrary SQL.

## If You Wanted To Build This Later

The usual migration path from your current app would be:

1. Keep your existing chatbot UI.
2. Replace the direct LLM call in the frontend with `fetch('/api/chat')`.
3. Create the backend shown in `backend/`.
4. Move API keys into backend environment variables.
5. Add MySQL tables for chat sessions, messages, internships, and students.
6. Add authentication before exposing real data.

## Running The Reference Example

This example is intentionally isolated. It is meant to be read and adapted, not dropped into production as-is.

If you want to experiment with it later:

1. Create a MySQL database.
2. Run `backend/sql/schema.sql`.
3. Create `backend/.env` from `backend/.env.example`.
4. Install backend dependencies inside `backend/`.
5. Start the backend.
6. Point a React page at `POST /api/chat`.

## Notes About Providers

The example backend uses the OpenAI Node SDK in the sample code because it is straightforward for tool calling.

You could swap that out for Gemini or another provider later. The architectural shape stays the same:

- frontend sends message to backend
- backend decides what DB operations are allowed
- backend calls the LLM
- backend stores and returns the result
