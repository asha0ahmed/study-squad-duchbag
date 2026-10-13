const nodemailer = require('nodemailer');

// Sends transactional email over any SMTP provider (Resend, Brevo, SendGrid,
// Mailgun, Gmail app password, your host's mail server...). Configure with
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM in .env.
let transporter = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    // Local development without SMTP: print the email so the link can be
    // copied from the terminal. Never prints in production.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[mail not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
      return;
    }
    throw new Error('SMTP is not configured (set SMTP_HOST and MAIL_FROM).');
  }
  await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendPasswordResetEmail({ to, name, link, minutes }) {
  const text =
`Hi ${name},

We received a request to reset your Study Squad password.

Open this link to choose a new password (valid for ${minutes} minutes):
${link}

If you didn't ask for this, you can ignore this email — your password won't change.`;

  const html =
`<p>Hi ${escapeHtml(name)},</p>
<p>We received a request to reset your Study Squad password.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
<p>This link is valid for ${minutes} minutes. Or paste it into your browser:<br>${escapeHtml(link)}</p>
<p>If you didn't ask for this, you can ignore this email — your password won't change.</p>`;

  await sendMail({ to, subject: 'Reset your Study Squad password', text, html });
}

module.exports = { sendMail, sendPasswordResetEmail, isConfigured };
