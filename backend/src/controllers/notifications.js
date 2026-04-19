import { pool } from "../db.js";
import { computeMatchScore } from "../utils/scoring.js";

// GET /api/notifications — list all notifications for the current student user
export const listNotifications = async (req, res) => {
  try {
    const [[settings]] = await pool.query(
      "SELECT id, field, in_app_notifications_enabled FROM student_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (!settings) {
      return res.json([]);
    }

    // If in-app notifications are disabled, return an empty list.
    if (settings && !settings.in_app_notifications_enabled) {
      return res.json([]);
    }

    const profileId = settings.id;

    const [[skills], [interests]] = await Promise.all([
      pool.query(
        "SELECT skill_name, proficiency_level FROM student_skills WHERE student_id = ?",
        [profileId]
      ),
      pool.query(
        "SELECT interest_type, interest_value FROM student_interests WHERE student_id = ?",
        [profileId]
      ),
    ]);

    const studentInfo = {
      skills: skills.map((s) => ({
        name: s.skill_name,
        level: s.proficiency_level,
      })),
      currentSubjects: interests
        .filter((i) => i.interest_type === "current_subject")
        .map((i) => i.interest_value),
      completedSubjects: interests
        .filter((i) => i.interest_type === "completed_subject")
        .map((i) => i.interest_value),
      personalChars: interests
        .filter((i) => i.interest_type === "personal_characteristic")
        .map((i) => i.interest_value),
      professionalInterests: interests
        .filter((i) => i.interest_type === "professional_interest")
        .map((i) => i.interest_value),
      preferredLocations: interests
        .filter((i) => i.interest_type === "preferred_location")
        .map((i) => i.interest_value),
      preferredRoleTracks: interests
        .filter((i) => i.interest_type === "preferred_role_track")
        .map((i) => i.interest_value),
      preferredWorkModes: interests
        .filter((i) => i.interest_type === "preferred_work_mode")
        .map((i) => i.interest_value),
      field: settings.field || "",
    };

    const [rows] = await pool.query(
      `SELECT n.id, n.case_id, n.match_score, n.is_read, n.created_at,
              c.title, c.task_focus, c.task_description, c.technical_terms, c.role_track, c.work_mode, c.location, c.company_id,
              cp.name AS company_name
       FROM notifications n
       JOIN cases c ON n.case_id = c.id
       JOIN company_profiles cp ON c.company_id = cp.id
       WHERE n.user_id = ?
       ORDER BY n.is_read ASC, n.created_at DESC`,
      [req.userId]
    );

    const caseIds = rows.map((r) => r.case_id);
    const caseQualsByCaseId = new Map();

    if (caseIds.length > 0) {
      const [quals] = await pool.query(
        "SELECT case_id, qualification_type, value FROM case_qualifications WHERE case_id IN (?)",
        [caseIds]
      );

      for (const q of quals) {
        if (!caseQualsByCaseId.has(q.case_id)) {
          caseQualsByCaseId.set(q.case_id, {
            required: [],
            preferred: [],
            personal: [],
          });
        }

        const bucket = caseQualsByCaseId.get(q.case_id);
        if (q.qualification_type === "professional_required" || q.qualification_type === "professional") {
          bucket.required.push(q.value);
        } else if (q.qualification_type === "professional_preferred") {
          bucket.preferred.push(q.value);
        } else if (q.qualification_type === "personal") {
          bucket.personal.push(q.value);
        }
      }
    }

    res.json(
      rows.map((r) => ({
        // Compute a live score so notifications reflect the student's latest profile.
        // Fall back to persisted score if anything is missing.
        matchScore: (() => {
          const quals = caseQualsByCaseId.get(r.case_id) || {
            required: [],
            preferred: [],
            personal: [],
          };

          try {
            return computeMatchScore(
              {
                taskText: r.task_description || r.task_focus || r.title || "",
                technicalTerms: r.technical_terms || "",
                requiredQuals: quals.required.join(", "),
                preferredQuals: quals.preferred.join(", "),
                personalQuals: quals.personal.join(", "),
                roleTrack: r.role_track || "",
                workMode: r.work_mode || "",
                location: r.location || "",
              },
              studentInfo
            );
          } catch {
            return r.match_score;
          }
        })(),
        id: r.id,
        caseId: r.case_id,
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
