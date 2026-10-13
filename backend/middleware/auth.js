const jwt = require('jsonwebtoken');
const pool = require('../db');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // A password reset sets password_changed_at; any login token issued
    // before it is rejected (iat is in whole seconds, so compare on seconds).
    const issuedBeforePasswordChange = (changedAt) =>
      !!changedAt && decoded.iat < Math.floor(new Date(changedAt).getTime() / 1000);

    if (decoded.role === 'mentor') {
      const mentorResult = await pool.query('SELECT password_changed_at FROM mentors WHERE id = $1', [decoded.mentorId]);
      if (mentorResult.rows.length === 0 || issuedBeforePasswordChange(mentorResult.rows[0].password_changed_at)) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
      req.mentor = decoded; // attaches { mentorId, email, role } to the request
      return next();
    }

    // Students only: a JWT is valid until it expires no matter what
    // happens to the account afterwards, so an admin marking a student
    // 'removed' (see PATCH /admin/students/:id/remove) wouldn't take
    // effect until the old token expired on its own. This one indexed
    // lookup by primary key is what makes removal immediate.
    const statusResult = await pool.query('SELECT status, password_changed_at FROM students WHERE id = $1', [decoded.studentId]);
    if (statusResult.rows.length === 0 || statusResult.rows[0].status === 'removed') {
      return res.status(403).json({ error: 'This account has been removed. Contact support if you believe this is a mistake.' });
    }
    if (issuedBeforePasswordChange(statusResult.rows[0].password_changed_at)) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.student = decoded; // attaches { studentId, email } to the request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = requireAuth;