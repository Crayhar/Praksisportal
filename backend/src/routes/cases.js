import express from "express";
import {
  listDrafts,
  createDraft,
  getDraft,
  updateDraft,
  deleteDraft,
  publishDraft,
  listPublishedCases,
  getPublishedCase,
} from "../controllers/cases.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Draft cases routes (company only)
router.get("/drafts", verifyToken, listDrafts);
router.post("/drafts", verifyToken, createDraft);
router.get("/drafts/:draftId", verifyToken, getDraft);
router.put("/drafts/:draftId", verifyToken, updateDraft);
router.delete("/drafts/:draftId", verifyToken, deleteDraft);
router.post("/drafts/:draftId/publish", verifyToken, publishDraft);

// Published cases routes (public read, company write)
router.get("/published", listPublishedCases);
router.get("/published/:caseId", getPublishedCase);

export default router;
