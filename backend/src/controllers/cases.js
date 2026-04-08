import { pool } from "../db.js";
import { computeMatchScore } from "../utils/scoring.js";
import { sendNotificationEmail } from "../utils/mailer.js";

// Converts a qualification value (string or array) to a clean array
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim())
    return val.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  return [];
};

const parseNullableInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

// Helper function to serialize case with qualifications and company name
const serializeCase = async (caseRecord) => {
  const [[companyRow], [qualifications]] = await Promise.all([
    pool.query("SELECT name FROM company_profiles WHERE id = ?", [caseRecord.company_id]),
    pool.query("SELECT qualification_type, value FROM case_qualifications WHERE case_id = ?", [caseRecord.id]),
  ]);

  let offerings = [];
  try {
    const [offeringRows] = await pool.query(
      "SELECT offering_type, offering_value FROM case_offerings WHERE case_id = ?",
      [caseRecord.id]
    );
    offerings = offeringRows;
  } catch (err) {
    // Keep API functional if case_offerings has not been migrated yet.
    if (err?.code !== 'ER_NO_SUCH_TABLE') {
      throw err;
    }
  }

  const companyName = companyRow?.name || "Bedrift";

  const organizedQuals = {
    companyQualifications: [],
    requiredQualifications: [],
    preferredQualifications: [],
    personalQualifications: [],
    professionalQualifications: [],
  };

  qualifications.forEach((qual) => {
    switch (qual.qualification_type) {
      case "company":
        organizedQuals.companyQualifications.push(qual.value);
        break;
      case "professional_required":
        organizedQuals.requiredQualifications.push(qual.value);
        organizedQuals.professionalQualifications.push(qual.value);
        break;
      case "professional_preferred":
        organizedQuals.preferredQualifications.push(qual.value);
        break;
      // Backward compatibility for older data before must-have / nice-to-have split
      case "professional":
        organizedQuals.requiredQualifications.push(qual.value);
        organizedQuals.professionalQualifications.push(qual.value);
        break;
      case "personal":
        organizedQuals.personalQualifications.push(qual.value);
        break;
    }
  });

  return {
    id: caseRecord.id,
    companyId: caseRecord.company_id,
    companyName,
    title: caseRecord.title,
    taskFocus: caseRecord.task_focus,
    status: caseRecord.status,
    roleTrack: caseRecord.role_track,
    assignmentContext: caseRecord.assignment_context,
    website: caseRecord.website,
    logo: caseRecord.logo,
    technicalTerms: caseRecord.technical_terms,
    taskDescription: caseRecord.task_description,
    deliveries: caseRecord.deliveries,
    expectations: caseRecord.expectations,
    candidateProfile: caseRecord.candidate_profile,
    collaborationStyle: caseRecord.collaboration_style,
    scopePreset: caseRecord.scope_preset,
    workMode: caseRecord.work_mode,
    location: caseRecord.location,
    startDate: caseRecord.start_date,
    endDate: caseRecord.end_date,
    startWithin: caseRecord.start_within,
    maxHours: caseRecord.max_hours,
    generatedAd: caseRecord.generated_ad,
    classification: caseRecord.classification,
    publishedAt: caseRecord.published_at,
    createdAt: caseRecord.created_at,
    updatedAt: caseRecord.updated_at,
    ...organizedQuals,
    offerings: offerings.map((o) => o.offering_type),
    offeringOther: offerings.find((o) => o.offering_type === "other")?.offering_value || "",
  };
};

// Helper to check if user owns a case or is admin
const checkCaseOwnership = async (userId, caseId) => {
  const [[user]] = await pool.query("SELECT role FROM users WHERE id = ?", [userId]);
  
  // Admins can access any case
  if (user?.role === 'admin') {
    return true;
  }

  // For non-admins, check if they own the company that owns the case
  const [[company]] = await pool.query(
    "SELECT id FROM company_profiles WHERE user_id = ? AND id = (SELECT company_id FROM cases WHERE id = ?)",
    [userId, caseId]
  );

  return !!company;
};

// Draft cases endpoints
export const listDrafts = async (req, res) => {
  try {
    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    const [drafts] = await pool.query(
      "SELECT * FROM cases WHERE company_id = ? AND status = 'draft'",
      [profiles[0].id]
    );

    const serializedDrafts = await Promise.all(
      drafts.map((draft) => serializeCase(draft))
    );

    res.json(serializedDrafts);
  } catch (error) {
    console.error("listDrafts error:", error);
    res.status(500).json({ error: "Failed to list drafts" });
  }
};

export const createDraft = async (req, res) => {
  try {
    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    const {
      title,
      taskFocus,
      roleTrack,
      assignmentContext,
      website,
      logo,
      technicalTerms,
      taskDescription,
      deliveries,
      expectations,
      companyQualifications,
      requiredQualifications,
      preferredQualifications,
      professionalQualifications,
      personalQualifications,
      candidateProfile,
      collaborationStyle,
      scopePreset,
      workMode,
      location,
      startDate,
      endDate,
      startWithin,
      maxHours,
      generatedAd,
      offerings,
    } = req.body;

    const parsedMaxHours = parseNullableInt(maxHours);

    const [result] = await pool.query(
      "INSERT INTO cases (company_id, title, task_focus, role_track, assignment_context, website, logo, technical_terms, task_description, deliveries, expectations, candidate_profile, collaboration_style, scope_preset, work_mode, location, start_date, end_date, start_within, max_hours, generated_ad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        profiles[0].id,
        title,
        taskFocus,
        roleTrack,
        assignmentContext,
        website,
        logo,
        technicalTerms,
        taskDescription,
        deliveries,
        expectations,
        candidateProfile,
        collaborationStyle,
        scopePreset,
        workMode,
        location,
        startDate,
        endDate,
        startWithin,
        parsedMaxHours,
        generatedAd || null,
      ]
    );

    const caseId = result.insertId;

    // Save qualifications
    const companyQualsArray = toArray(companyQualifications);
    const requiredQualsArray = toArray(requiredQualifications || professionalQualifications);
    const preferredQualsArray = toArray(preferredQualifications);
    const personalQualsArray = toArray(personalQualifications);

    for (const qual of companyQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'company', ?)",
        [caseId, qual]
      );
    }
    for (const qual of requiredQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional_required', ?)",
        [caseId, qual]
      );
    }
    for (const qual of preferredQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional_preferred', ?)",
        [caseId, qual]
      );
    }
    for (const qual of personalQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'personal', ?)",
        [caseId, qual]
      );
    }

    // Save offerings
    const offeringsArray = Array.isArray(offerings) ? offerings : toArray(offerings);
    for (const offering of offeringsArray) {
      const val = offering === "other" ? (req.body.offeringOther || null) : null;
      await pool.query(
        "INSERT INTO case_offerings (case_id, offering_type, offering_value) VALUES (?, ?, ?)",
        [caseId, offering, val]
      );
    }

    const [newCase] = await pool.query("SELECT * FROM cases WHERE id = ?", [caseId]);
    const serialized = await serializeCase(newCase[0]);
    res.status(201).json(serialized);
  } catch (error) {
    console.error("createDraft error:", error);
    res.status(500).json({ error: "Failed to create draft" });
  }
};

export const getDraft = async (req, res) => {
  try {
    const { draftId } = req.params;

    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    const [drafts] = await pool.query(
      "SELECT * FROM cases WHERE id = ? AND company_id = ? AND status = 'draft'",
      [draftId, profiles[0].id]
    );

    if (drafts.length === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const serialized = await serializeCase(drafts[0]);
    res.json(serialized);
  } catch (error) {
    console.error("getDraft error:", error);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
};

export const updateDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const {
      title,
      taskFocus,
      roleTrack,
      assignmentContext,
      website,
      logo,
      technicalTerms,
      taskDescription,
      deliveries,
      expectations,
      companyQualifications,
      requiredQualifications,
      preferredQualifications,
      professionalQualifications,
      personalQualifications,
      candidateProfile,
      collaborationStyle,
      scopePreset,
      workMode,
      location,
      startDate,
      endDate,
      startWithin,
      maxHours,
      generatedAd,
      offerings,
    } = req.body;

    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    const parsedMaxHours = parseNullableInt(maxHours);

    await pool.query(
      "UPDATE cases SET title = ?, task_focus = ?, role_track = ?, assignment_context = ?, website = ?, logo = ?, technical_terms = ?, task_description = ?, deliveries = ?, expectations = ?, candidate_profile = ?, collaboration_style = ?, scope_preset = ?, work_mode = ?, location = ?, start_date = ?, end_date = ?, start_within = ?, max_hours = ?, generated_ad = ? WHERE id = ? AND company_id = ? AND status = 'draft'",
      [
        title,
        taskFocus,
        roleTrack,
        assignmentContext,
        website,
        logo,
        technicalTerms,
        taskDescription,
        deliveries,
        expectations,
        candidateProfile,
        collaborationStyle,
        scopePreset,
        workMode,
        location,
        startDate,
        endDate,
        startWithin,
        parsedMaxHours,
        generatedAd,
        draftId,
        profiles[0].id,
      ]
    );

    // Update qualifications
    await pool.query("DELETE FROM case_qualifications WHERE case_id = ?", [draftId]);

    const companyQualsArray = toArray(companyQualifications);
    const requiredQualsArray = toArray(requiredQualifications || professionalQualifications);
    const preferredQualsArray = toArray(preferredQualifications);
    const personalQualsArray = toArray(personalQualifications);

    for (const qual of companyQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'company', ?)",
        [draftId, qual]
      );
    }
    for (const qual of requiredQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional_required', ?)",
        [draftId, qual]
      );
    }
    for (const qual of preferredQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional_preferred', ?)",
        [draftId, qual]
      );
    }
    for (const qual of personalQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'personal', ?)",
        [draftId, qual]
      );
    }

    // Update offerings
    await pool.query("DELETE FROM case_offerings WHERE case_id = ?", [draftId]);
    const offeringsArray = Array.isArray(offerings) ? offerings : toArray(offerings);
    for (const offering of offeringsArray) {
      const val = offering === "other" ? (req.body.offeringOther || null) : null;
      await pool.query(
        "INSERT INTO case_offerings (case_id, offering_type, offering_value) VALUES (?, ?, ?)",
        [draftId, offering, val]
      );
    }

    res.json({ message: "Draft updated successfully" });
  } catch (error) {
    console.error("updateDraft error:", error);
    res.status(500).json({ error: "Failed to update draft" });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const { draftId } = req.params;

    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    await pool.query(
      "DELETE FROM cases WHERE id = ? AND company_id = ? AND status = 'draft'",
      [draftId, profiles[0].id]
    );

    res.json({ message: "Draft deleted successfully" });
  } catch (error) {
    console.error("deleteDraft error:", error);
    res.status(500).json({ error: "Failed to delete draft" });
  }
};

// Generate notifications for all students whose match score >= their threshold
const generateNotificationsForCase = async (caseId) => {
  try {
    // Fetch the case
    const [[caseRow]] = await pool.query("SELECT * FROM cases WHERE id = ?", [caseId]);
    if (!caseRow) return;

    // Fetch company name for the email
    const [[companyRow]] = await pool.query(
      "SELECT name FROM company_profiles WHERE id = ?",
      [caseRow.company_id]
    );
    const companyName = companyRow?.name || "Bedrift";

    // Fetch case qualifications
    const [qualRows] = await pool.query(
      "SELECT qualification_type, value FROM case_qualifications WHERE case_id = ?",
      [caseId]
    );
    const requiredQuals = qualRows
      .filter((q) => q.qualification_type === "professional_required")
      .map((q) => q.value).join(", ");
    const preferredQuals = qualRows
      .filter((q) => q.qualification_type === "professional_preferred")
      .map((q) => q.value).join(", ");
    const personalQuals = qualRows
      .filter((q) => q.qualification_type === "personal")
      .map((q) => q.value).join(", ");

    const caseInfo = {
      taskText: [caseRow.task_focus, caseRow.assignment_context, caseRow.task_description, caseRow.deliveries, caseRow.expectations].join(" "),
      technicalTerms: caseRow.technical_terms || "",
      requiredQuals,
      preferredQuals,
      personalQuals,
    };

    // Fetch all student profiles with threshold
    const [students] = await pool.query(
      `SELECT sp.id AS profile_id, sp.user_id, sp.notification_threshold,
              u.email, u.first_name, u.last_name
       FROM student_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE u.role = 'student'`
    );

    for (const student of students) {
      const threshold = student.notification_threshold || 65;

      // Fetch student's skills (with proficiency level) and interests
      const [skills] = await pool.query(
        "SELECT skill_name, proficiency_level FROM student_skills WHERE student_id = ?",
        [student.profile_id]
      );
      const [interests] = await pool.query(
        "SELECT interest_type, interest_value FROM student_interests WHERE student_id = ?",
        [student.profile_id]
      );

      const studentInfo = {
        skills: skills.map((s) => ({ name: s.skill_name, level: s.proficiency_level })),
        currentSubjects: interests.filter((i) => i.interest_type === "current_subject").map((i) => i.interest_value),
        completedSubjects: interests.filter((i) => i.interest_type === "completed_subject").map((i) => i.interest_value),
        personalChars: interests.filter((i) => i.interest_type === "personal_characteristic").map((i) => i.interest_value),
        professionalInterests: interests.filter((i) => i.interest_type === "professional_interest").map((i) => i.interest_value),
      };

      const score = computeMatchScore(caseInfo, studentInfo);

      if (score >= threshold) {
        // Insert, ignore duplicate (case already notified to this student)
        const [result] = await pool.query(
          "INSERT IGNORE INTO notifications (user_id, case_id, match_score) VALUES (?, ?, ?)",
          [student.user_id, caseId, score]
        );

        // Only send email for genuinely new notifications (not duplicates)
        if (result.affectedRows > 0) {
          sendNotificationEmail({
            to: student.email,
            studentName: student.first_name,
            caseTitle: caseRow.title,
            companyName,
            matchScore: score,
          });
        }
      }
    }
  } catch (err) {
    // Don't fail the publish request if notification generation fails
    console.error("generateNotificationsForCase error:", err);
  }
};

export const publishDraft = async (req, res) => {
  try {
    const { draftId } = req.params;

    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    await pool.query(
      "UPDATE cases SET status = 'published', published_at = NOW() WHERE id = ? AND company_id = ? AND status = 'draft'",
      [draftId, profiles[0].id]
    );

    const [published] = await pool.query("SELECT * FROM cases WHERE id = ?", [draftId]);

    if (published.length === 0) {
      return res.status(404).json({ error: "Case not found or already published" });
    }

    const serialized = await serializeCase(published[0]);
    res.json(serialized);

    // Fire-and-forget: generate notifications for matching students
    generateNotificationsForCase(draftId);
  } catch (error) {
    console.error("publishDraft error:", error);
    res.status(500).json({ error: "Failed to publish draft" });
  }
};

// Published cases endpoints
export const listPublishedCases = async (req, res) => {
  try {
    const [cases] = await pool.query(
      "SELECT * FROM cases WHERE status = 'published' ORDER BY published_at DESC"
    );

    const serialized = await Promise.all(
      cases.map((caseRecord) => serializeCase(caseRecord))
    );

    res.json(serialized);
  } catch (error) {
    console.error("listPublishedCases error:", error);
    res.status(500).json({ error: "Failed to list published cases" });
  }
};

export const getPublishedCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const [cases] = await pool.query(
      "SELECT * FROM cases WHERE id = ? AND status = 'published'",
      [caseId]
    );

    if (cases.length === 0) {
      return res.status(404).json({ error: "Case not found" });
    }

    const serialized = await serializeCase(cases[0]);
    res.json(serialized);
  } catch (error) {
    console.error("getPublishedCase error:", error);
    res.status(500).json({ error: "Failed to fetch case" });
  }
};

export const updatePublishedCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const {
      title,
      taskFocus,
      roleTrack,
      assignmentContext,
      website,
      logo,
      technicalTerms,
      taskDescription,
      deliveries,
      expectations,
      companyQualifications,
      requiredQualifications,
      preferredQualifications,
      professionalQualifications,
      personalQualifications,
      candidateProfile,
      collaborationStyle,
      scopePreset,
      workMode,
      location,
      startDate,
      endDate,
      startWithin,
      maxHours,
      generatedAd,
      offerings,
    } = req.body;

    // Check authorization - user must own the case or be admin
    const isOwner = await checkCaseOwnership(req.userId, caseId);
    if (!isOwner) {
      return res.status(403).json({ error: "Not authorized to update this case" });
    }

    const parsedMaxHours = parseNullableInt(maxHours);

    await pool.query(
      "UPDATE cases SET title = ?, task_focus = ?, role_track = ?, assignment_context = ?, website = ?, logo = ?, technical_terms = ?, task_description = ?, deliveries = ?, expectations = ?, candidate_profile = ?, collaboration_style = ?, scope_preset = ?, work_mode = ?, location = ?, start_date = ?, end_date = ?, start_within = ?, max_hours = ?, generated_ad = ? WHERE id = ? AND status = 'published'",
      [
        title,
        taskFocus,
        roleTrack,
        assignmentContext,
        website,
        logo,
        technicalTerms,
        taskDescription,
        deliveries,
        expectations,
        candidateProfile,
        collaborationStyle,
        scopePreset,
        workMode,
        location,
        startDate,
        endDate,
        startWithin,
        parsedMaxHours,
        generatedAd,
        caseId,
      ]
    );

    // Update qualifications
    await pool.query("DELETE FROM case_qualifications WHERE case_id = ?", [caseId]);

    const companyQualsArray = toArray(companyQualifications);
    const requiredQualsArray = toArray(requiredQualifications || professionalQualifications);
    const preferredQualsArray = toArray(preferredQualifications);
    const personalQualsArray = toArray(personalQualifications);

    for (const qual of companyQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'company', ?)",
        [caseId, qual]
      );
    }
    for (const qual of requiredQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional_required', ?)",
        [caseId, qual]
      );
    }
    for (const qual of preferredQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional_preferred', ?)",
        [caseId, qual]
      );
    }
    for (const qual of personalQualsArray) {
      await pool.query(
        "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'personal', ?)",
        [caseId, qual]
      );
    }

    // Update offerings
    await pool.query("DELETE FROM case_offerings WHERE case_id = ?", [caseId]);
    const offeringsArray = Array.isArray(offerings) ? offerings : toArray(offerings);
    for (const offering of offeringsArray) {
      const val = offering === "other" ? (req.body.offeringOther || null) : null;
      await pool.query(
        "INSERT INTO case_offerings (case_id, offering_type, offering_value) VALUES (?, ?, ?)",
        [caseId, offering, val]
      );
    }

    const [updated] = await pool.query("SELECT * FROM cases WHERE id = ?", [caseId]);
    const serialized = await serializeCase(updated[0]);
    res.json(serialized);
  } catch (error) {
    console.error("updatePublishedCase error:", error);
    res.status(500).json({ error: "Failed to update case" });
  }
};

export const deletePublishedCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    // Check authorization - user must own the case or be admin
    const isOwner = await checkCaseOwnership(req.userId, caseId);
    if (!isOwner) {
      return res.status(403).json({ error: "Not authorized to delete this case" });
    }

    await pool.query(
      "DELETE FROM cases WHERE id = ? AND status = 'published'",
      [caseId]
    );

    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    console.error("deletePublishedCase error:", error);
    res.status(500).json({ error: "Failed to delete case" });
  }
};
