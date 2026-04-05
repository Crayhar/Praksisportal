import { pool } from "../db.js";

// Helper function to serialize case with qualifications
const serializeCase = async (caseRecord) => {
  const [qualifications] = await pool.query(
    "SELECT qualification_type, value FROM case_qualifications WHERE case_id = ?",
    [caseRecord.id]
  );

  const organizedQuals = {
    companyQualifications: [],
    professionalQualifications: [],
    personalQualifications: [],
  };

  qualifications.forEach((qual) => {
    switch (qual.qualification_type) {
      case "company":
        organizedQuals.companyQualifications.push(qual.value);
        break;
      case "professional":
        organizedQuals.professionalQualifications.push(qual.value);
        break;
      case "personal":
        organizedQuals.personalQualifications.push(qual.value);
        break;
    }
  });

  return {
    ...caseRecord,
    ...organizedQuals,
  };
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
      candidateProfile,
      collaborationStyle,
      scopePreset,
      workMode,
      location,
      startDate,
      endDate,
      startWithin,
      maxHours,
      salaryType,
      compensationAmount,
    } = req.body;

    const [result] = await pool.query(
      "INSERT INTO cases (company_id, title, task_focus, role_track, assignment_context, website, logo, technical_terms, task_description, deliveries, expectations, candidate_profile, collaboration_style, scope_preset, work_mode, location, start_date, end_date, start_within, max_hours, salary_type, compensation_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        maxHours,
        salaryType,
        compensationAmount,
      ]
    );

    const caseId = result.insertId;
    const [newCase] = await pool.query("SELECT * FROM cases WHERE id = ?", [
      caseId,
    ]);

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
      salaryType,
      compensationAmount,
      generatedAd,
    } = req.body;

    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(403).json({ error: "Company profile not found" });
    }

    await pool.query(
      "UPDATE cases SET title = ?, task_focus = ?, role_track = ?, assignment_context = ?, website = ?, logo = ?, technical_terms = ?, task_description = ?, deliveries = ?, expectations = ?, candidate_profile = ?, collaboration_style = ?, scope_preset = ?, work_mode = ?, location = ?, start_date = ?, end_date = ?, start_within = ?, max_hours = ?, salary_type = ?, compensation_amount = ?, generated_ad = ? WHERE id = ? AND company_id = ? AND status = 'draft'",
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
        maxHours,
        salaryType,
        compensationAmount,
        generatedAd,
        draftId,
        profiles[0].id,
      ]
    );

    // Update qualifications
    await pool.query("DELETE FROM case_qualifications WHERE case_id = ?", [
      draftId,
    ]);

    if (companyQualifications && companyQualifications.length > 0) {
      for (const qual of companyQualifications) {
        await pool.query(
          "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'company', ?)",
          [draftId, qual]
        );
      }
    }

    if (professionalQualifications && professionalQualifications.length > 0) {
      for (const qual of professionalQualifications) {
        await pool.query(
          "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'professional', ?)",
          [draftId, qual]
        );
      }
    }

    if (personalQualifications && personalQualifications.length > 0) {
      for (const qual of personalQualifications) {
        await pool.query(
          "INSERT INTO case_qualifications (case_id, qualification_type, value) VALUES (?, 'personal', ?)",
          [draftId, qual]
        );
      }
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

    const [published] = await pool.query("SELECT * FROM cases WHERE id = ?", [
      draftId,
    ]);

    if (published.length === 0) {
      return res.status(404).json({ error: "Case not found or already published" });
    }

    const serialized = await serializeCase(published[0]);
    res.json(serialized);
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
