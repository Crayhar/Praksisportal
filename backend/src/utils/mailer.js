import nodemailer from "nodemailer";

// Build a transporter lazily so missing env vars don't crash startup.
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM)
// in backend/.env.  If SMTP_HOST is absent the module logs a warning and
// sendNotificationEmail becomes a no-op so the rest of the app keeps working.

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn("[mailer] SMTP_HOST not set — email sending is disabled.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send a "new matching case" notification email to a student.
 *
 * @param {{ to: string, studentName: string, caseTitle: string, companyName: string, matchScore: number }} opts
 */
export async function sendNotificationEmail({ to, studentName, caseTitle, companyName, matchScore }) {
  const transport = getTransporter();
  if (!transport) return; // email disabled — fail silently

  const from = process.env.SMTP_FROM || `"Praksisportal" <no-reply@praksisportal.no>`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
    <h2 style="color:#2d6a4f;margin-top:0;">Det er et nytt prosjekt som kan passe for deg!</h2>
    <p style="color:#374151;">Hei ${studentName},</p>
    <p style="color:#374151;">
      En ny praksisplass har blitt publisert på Praksisportal som matcher profilen din med
      <strong>${matchScore}%</strong>.
    </p>
    <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid #2d6a4f;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:1rem;font-weight:700;color:#111827;">${caseTitle}</p>
      <p style="margin:0;font-size:0.9rem;color:#6b7280;">${companyName}</p>
    </div>
    <a href="${process.env.APP_URL || "http://localhost:5173"}/internships"
       style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:4px;">
      Se praksisplassen
    </a>
    <p style="color:#9ca3af;font-size:0.8rem;margin-top:32px;">
      Du mottar denne e-posten fordi din matchterskel er satt til ${matchScore >= 80 ? 'sterk match' : 'relevant match'}.
      Du kan endre terskelen på <a href="${process.env.APP_URL || "http://localhost:5173"}/profile" style="color:#2d6a4f;">profilsiden din</a>.
    </p>
  </div>`;

  const text = `Hei ${studentName},\n\nDet er et nytt prosjekt som kan passe for deg!\n\n"${caseTitle}" fra ${companyName} matcher profilen din med ${matchScore}%.\n\nSe praksisplassen: ${process.env.APP_URL || "http://localhost:5173"}/internships`;

  try {
    await transport.sendMail({
      from,
      to,
      subject: "Det er et nytt prosjekt som kan passe for deg! 🎓",
      text,
      html,
    });
  } catch (err) {
    // Never let email errors break the publish flow
    console.error("[mailer] Failed to send notification email:", err.message);
  }
}
