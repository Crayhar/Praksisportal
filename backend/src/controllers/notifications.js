import { pool } from "../db.js";

// GET /api/notifications — list all notifications for the current student user
export const listNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.case_id, n.match_score, n.is_read, n.created_at,
              c.title, c.task_focus, c.company_id,
              cp.name AS company_name
       FROM notifications n
       JOIN cases c ON n.case_id = c.id
       JOIN company_profiles cp ON c.company_id = cp.id
       WHERE n.user_id = ?
       ORDER BY n.is_read ASC, n.created_at DESC`,
      [req.userId]
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        caseId: r.case_id,
        matchScore: r.match_score,
        isRead: !!r.is_read,
        createdAt: r.created_at,
        caseTitle: r.title,
        caseTaskFocus: r.task_focus,
        companyName: r.company_name,
      }))
    );
  } catch (error) {
    console.error("listNotifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// PUT /api/notifications/:id/read — mark one notification as read
export const markRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("markRead error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

// PUT /api/notifications/read-all — mark all notifications as read for current user
export const markAllRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
      [req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("markAllRead error:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};
