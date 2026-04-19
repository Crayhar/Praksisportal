import express from "express";
import {
  getStudentProfile,
  updateStudentProfile,
  addStudentSkill,
  removeStudentSkill,
  addStudentInterest,
  removeStudentInterest,
  getCompanyProfile,
  getCompanyProfileById,
  updateCompanyProfile,
  addCompanyQualification,
  removeCompanyQualification,
} from "../controllers/profile.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Student profile routes
router.get("/student", verifyToken, getStudentProfile);
router.put("/student", verifyToken, updateStudentProfile);
router.post("/student/skills", verifyToken, addStudentSkill);
router.delete("/student/skills/:skillName", verifyToken, removeStudentSkill);
router.post("/student/interests", verifyToken, addStudentInterest);
router.delete("/student/interests/:interestId", verifyToken, removeStudentInterest);

// Company profile routes
router.get("/company", verifyToken, getCompanyProfile);
router.get("/company/:companyId", getCompanyProfileById);
router.put("/company", verifyToken, updateCompanyProfile);
router.post("/company/qualifications", verifyToken, addCompanyQualification);
router.delete("/company/qualifications/:qualificationId", verifyToken, removeCompanyQualification);

export default router;
