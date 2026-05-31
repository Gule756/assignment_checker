/**
 * JWT authentication middleware.
 * Verifies the Bearer token from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'ASSIGNMENT_SYSTEM_JWT_SECRET_2024';

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Only allow teachers through */
function teacherOnly(req, res, next) {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ error: 'Teachers only' });
  }
  next();
}

module.exports = { authMiddleware, teacherOnly };
