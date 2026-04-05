import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export const signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, firstName, lastName, role]
    );

    const userId = result.insertId;

    // Create profile based on role
    if (role === "student") {
      await pool.query(
        "INSERT INTO student_profiles (user_id) VALUES (?)",
        [userId]
      );
    } else if (role === "company") {
      await pool.query(
        "INSERT INTO company_profiles (user_id, name) VALUES (?, ?)",
        [userId, firstName]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const [users] = await pool.query(
      "SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const logout = async (req, res) => {
  // Token invalidation would be handled client-side by removing the token from localStorage
  res.json({ message: "Logged out successfully" });
};

export const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, email, first_name, last_name, role FROM users WHERE id = ?",
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    });
  } catch (error) {
    console.error("getCurrentUser error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};
