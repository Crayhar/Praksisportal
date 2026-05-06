import { pool } from '../db.js';
import { sendWelcomeEmail } from '../utils/mailer.js';

export const registerLead = async (req, res) => {
  try {
    const { companyName, firstName, lastName, email, wantsContact } = req.body;

    if (!companyName || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Alle felt må fylles ut' });
    }

    await pool.query(
      'INSERT INTO company_leads (company_name, first_name, last_name, email, wants_contact) VALUES (?, ?, ?, ?, ?)',
      [companyName, firstName, lastName, email, wantsContact ? 1 : 0]
    );

    if (wantsContact) {
      await sendWelcomeEmail({ to: email, firstName, companyName });
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('registerLead error:', error);
    res.status(500).json({ error: 'Registrering feilet' });
  }
};
