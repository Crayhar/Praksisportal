import express from 'express';
import { registerLead } from '../controllers/leads.js';

const router = express.Router();

router.post('/register', registerLead);

export default router;
