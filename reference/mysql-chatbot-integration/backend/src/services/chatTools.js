import { pool } from "../db.js";

export const toolDefinitions = [
  {
    type: "function",
    name: "listInternships",
    description: "List internships, optionally filtered by city or study area.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string" },
        studyArea: { type: "string" }
      },
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getStudentProfile",
    description: "Get a student profile by numeric student id.",
    parameters: {
      type: "object",
      properties: {
        studentId: { type: "integer" }
      },
      required: ["studentId"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "createChatNote",
    description: "Create an internal chat note for a student.",
    parameters: {
      type: "object",
      properties: {
        studentId: { type: "integer" },
        note: { type: "string" }
      },
      required: ["studentId", "note"],
      additionalProperties: false
    }
  }
];

export async function executeToolCall(name, args) {
  switch (name) {
    case "listInternships":
      return listInternships(args);
    case "getStudentProfile":
      return getStudentProfile(args);
    case "createChatNote":
      return createChatNote(args);
    default:
      throw new Error(`Unsupported tool: ${name}`);
  }
}

async function listInternships({ city, studyArea }) {
  const clauses = [];
  const params = [];

  if (city) {
    clauses.push("city = ?");
    params.push(city);
  }

  if (studyArea) {
    clauses.push("study_area = ?");
    params.push(studyArea);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sql = `
    SELECT id, title, company_name, city, study_area
    FROM internships
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 10
  `;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getStudentProfile({ studentId }) {
  const [rows] = await pool.execute(
    `
      SELECT id, full_name, email, study_program, graduation_year
      FROM students
      WHERE id = ?
      LIMIT 1
    `,
    [studentId]
  );

  return rows[0] || null;
}

async function createChatNote({ studentId, note }) {
  if (typeof note !== "string" || !note.trim()) {
    throw new Error("Note is required.");
  }

  const [result] = await pool.execute(
    `
      INSERT INTO chat_notes (student_id, note_text)
      VALUES (?, ?)
    `,
    [studentId, note.trim()]
  );

  return { insertedId: result.insertId, saved: true };
}
