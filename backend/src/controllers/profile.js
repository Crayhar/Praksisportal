import { pool } from "../db.js";

function organizeCompanyQualifications(qualifications) {
  const organizedQuals = {
    companyQualifications: [],
    workAreas: [],
    hiringFocus: [],
  };

  qualifications.forEach((qual) => {
    switch (qual.qualification_type) {
      case "core_qualification":
        organizedQuals.companyQualifications.push(qual.value);
        break;
      case "work_area":
        organizedQuals.workAreas.push(qual.value);
        break;
      case "hiring_focus":
        organizedQuals.hiringFocus.push(qual.value);
        break;
    }
  });

  return organizedQuals;
}

// Student profile endpoints
export const getStudentProfile = async (req, res) => {
  try {
    const [profiles] = await pool.query(
      "SELECT sp.*, u.first_name, u.last_name, u.email, u.phone FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const profile = profiles[0];

    // Fetch skills
    const [skills] = await pool.query(
      "SELECT skill_name, proficiency_level FROM student_skills WHERE student_id = ?",
      [profile.id]
    );

    // Fetch interests by type
    const [interests] = await pool.query(
      "SELECT interest_type, interest_value FROM student_interests WHERE student_id = ?",
      [profile.id]
    );

    // Organize interests by type
    const organizedInterests = {
      personalCharacteristics: [],
      professionalInterests: [],
      currentSubjects: [],
      completedSubjects: [],
      preferredLocations: [],
      preferredRoleTracks: [],
      preferredWorkModes: [],
    };

    interests.forEach((interest) => {
      switch (interest.interest_type) {
        case "personal_characteristic":
          organizedInterests.personalCharacteristics.push(interest.interest_value);
          break;
        case "professional_interest":
          organizedInterests.professionalInterests.push(interest.interest_value);
          break;
        case "current_subject":
          organizedInterests.currentSubjects.push(interest.interest_value);
          break;
        case "completed_subject":
          organizedInterests.completedSubjects.push(interest.interest_value);
          break;
        case "preferred_location":
          organizedInterests.preferredLocations.push(interest.interest_value);
          break;
        case "preferred_role_track":
          organizedInterests.preferredRoleTracks.push(interest.interest_value);
          break;
        case "preferred_work_mode":
          organizedInterests.preferredWorkModes.push(interest.interest_value);
          break;
      }
    });

    res.json({
      ...profile,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      link1: profile.link1 || '',
      link2: profile.link2 || '',
      link3: profile.link3 || '',
      skills: skills.map((s) => ({
        name: s.skill_name,
        level: s.proficiency_level,
      })),
      ...organizedInterests,
    });
  } catch (error) {
    console.error("getStudentProfile error:", error);
    res.status(500).json({ error: "Failed to fetch student profile" });
  }
};

export const updateStudentProfile = async (req, res) => {
  try {
    const {
      school,
      field,
      degreeLevel,
      graduationYear,
      location,
      bio,
      headline,
      notificationThreshold,
      inAppNotificationsEnabled,
      emailNotificationsEnabled,
      phone,
      link1,
      link2,
      link3,
    } = req.body;

    // Update phone in users table if provided
    if (phone !== undefined) {
      await pool.query(
        "UPDATE users SET phone = ? WHERE id = ?",
        [phone, req.userId]
      );
    }

    await pool.query(
      "UPDATE student_profiles SET school = ?, field = ?, degree_level = ?, graduation_year = ?, location = ?, bio = ?, headline = ?, notification_threshold = ?, in_app_notifications_enabled = ?, email_notifications_enabled = ?, link1 = ?, link2 = ?, link3 = ? WHERE user_id = ?",
      [
        school,
        field,
        degreeLevel,
        graduationYear,
        location,
        bio,
        headline,
        notificationThreshold,
        inAppNotificationsEnabled !== false,
        emailNotificationsEnabled === true,
        link1 || null,
        link2 || null,
        link3 || null,
        req.userId,
      ]
    );

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("updateStudentProfile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const addStudentSkill = async (req, res) => {
  try {
    const { skillName, proficiencyLevel } = req.body;

    const [profiles] = await pool.query(
      "SELECT id FROM student_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    await pool.query(
      "INSERT INTO student_skills (student_id, skill_name, proficiency_level) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE proficiency_level = ?",
      [profiles[0].id, skillName, proficiencyLevel, proficiencyLevel]
    );

    res.json({ message: "Skill added successfully" });
  } catch (error) {
    console.error("addStudentSkill error:", error);
    res.status(500).json({ error: "Failed to add skill" });
  }
};

export const removeStudentSkill = async (req, res) => {
  try {
    const { skillName } = req.params;

    const [profiles] = await pool.query(
      "SELECT id FROM student_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    await pool.query(
      "DELETE FROM student_skills WHERE student_id = ? AND skill_name = ?",
      [profiles[0].id, skillName]
    );

    res.json({ message: "Skill removed successfully" });
  } catch (error) {
    console.error("removeStudentSkill error:", error);
    res.status(500).json({ error: "Failed to remove skill" });
  }
};

export const addStudentInterest = async (req, res) => {
  try {
    const { interestType, interestValue } = req.body;

    const [profiles] = await pool.query(
      "SELECT id FROM student_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    await pool.query(
      "INSERT INTO student_interests (student_id, interest_type, interest_value) VALUES (?, ?, ?)",
      [profiles[0].id, interestType, interestValue]
    );

    res.json({ message: "Interest added successfully" });
  } catch (error) {
    console.error("addStudentInterest error:", error);
    res.status(500).json({ error: "Failed to add interest" });
  }
};

export const removeStudentInterest = async (req, res) => {
  try {
    const { interestId } = req.params;

    await pool.query(
      "DELETE FROM student_interests WHERE id = ?",
      [interestId]
    );

    res.json({ message: "Interest removed successfully" });
  } catch (error) {
    console.error("removeStudentInterest error:", error);
    res.status(500).json({ error: "Failed to remove interest" });
  }
};

// Company profile endpoints
export const getCompanyProfile = async (req, res) => {
  try {
    const [profiles] = await pool.query(
      "SELECT * FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Company profile not found" });
    }

    const profile = profiles[0];

    // Fetch qualifications by type
    const [qualifications] = await pool.query(
      "SELECT qualification_type, value FROM company_qualifications WHERE company_id = ?",
      [profile.id]
    );

    const organizedQuals = organizeCompanyQualifications(qualifications);

    res.json({
      ...profile,
      ...organizedQuals,
    });
  } catch (error) {
    console.error("getCompanyProfile error:", error);
    res.status(500).json({ error: "Failed to fetch company profile" });
  }
};

export const updateCompanyProfile = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, website, logo, industry, size, location, description, registrationComplete, expectationsQualityScore } = req.body;

    await pool.query(
      "UPDATE company_profiles SET name = ?, contact_person = ?, email = ?, phone = ?, website = ?, logo = ?, industry = ?, size = ?, location = ?, description = ?, registration_complete = ?, expectations_quality_score = ? WHERE user_id = ?",
      [name, contactPerson, email, phone, website, logo, industry, size, location, description, registrationComplete, expectationsQualityScore, req.userId]
    );

    // Fetch and return the updated profile
    const [profiles] = await pool.query(
      "SELECT * FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Company profile not found" });
    }

    const profile = profiles[0];

    // Fetch qualifications by type
    const [qualifications] = await pool.query(
      "SELECT qualification_type, value FROM company_qualifications WHERE company_id = ?",
      [profile.id]
    );

    const organizedQuals = organizeCompanyQualifications(qualifications);

    res.json({
      ...profile,
      ...organizedQuals,
    });
  } catch (error) {
    console.error("updateCompanyProfile error:", error);
    res.status(500).json({ error: "Failed to update company profile" });
  }
};

export const addCompanyQualification = async (req, res) => {
  try {
    const { qualificationType, value } = req.body;

    const [profiles] = await pool.query(
      "SELECT id FROM company_profiles WHERE user_id = ?",
      [req.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Company profile not found" });
    }

    await pool.query(
      "INSERT INTO company_qualifications (company_id, qualification_type, value) VALUES (?, ?, ?)",
      [profiles[0].id, qualificationType, value]
    );

    res.json({ message: "Qualification added successfully" });
  } catch (error) {
    console.error("addCompanyQualification error:", error);
    res.status(500).json({ error: "Failed to add qualification" });
  }
};

export const removeCompanyQualification = async (req, res) => {
  try {
    const { qualificationId } = req.params;

    await pool.query(
      "DELETE FROM company_qualifications WHERE id = ?",
      [qualificationId]
    );

    res.json({ message: "Qualification removed successfully" });
  } catch (error) {
    console.error("removeCompanyQualification error:", error);
    res.status(500).json({ error: "Failed to remove qualification" });
  }
};

export const getCompanyProfileById = async (req, res) => {
  try {
    const companyId = Number.parseInt(req.params.companyId, 10);
    if (!Number.isFinite(companyId)) {
      return res.status(400).json({ error: "Invalid company id" });
    }

    const [profiles] = await pool.query(
      "SELECT id, user_id, name, contact_person, email, phone, website, logo, industry, size, location, description, created_at, updated_at FROM company_profiles WHERE id = ?",
      [companyId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Company profile not found" });
    }

    const profile = profiles[0];
    const [qualifications] = await pool.query(
      "SELECT qualification_type, value FROM company_qualifications WHERE company_id = ?",
      [companyId]
    );

    const organizedQuals = organizeCompanyQualifications(qualifications);

    res.json({
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      contactPerson: profile.contact_person,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      logo: profile.logo,
      industry: profile.industry,
      size: profile.size,
      location: profile.location,
      description: profile.description,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      ...organizedQuals,
    });
  } catch (error) {
    console.error("getCompanyProfileById error:", error);
    res.status(500).json({ error: "Failed to fetch company profile" });
  }
};
