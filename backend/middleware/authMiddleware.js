// backend/middleware/authMiddleware.js
//
// Runs BEFORE any protected route handler.
// Reads the JWT from the HttpOnly cookie, verifies it,
// and attaches the decoded user payload to req.user.
//
// If the token is missing or invalid, stops the request with 401 Unauthorized.
// The actual route controller only runs if next() is called.

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Read the 'token' cookie (set during login/register)
  const token = req.cookies.token;

  // No cookie → not logged in
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    // jwt.verify() does two things:
    //   1. Checks the signature using JWT_SECRET (was this token issued by us?)
    //   2. Checks expiry (has the 7-day window passed?)
    // If either fails, it throws an error caught below.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded = { id: 5, email: 'user@example.com', iat: ..., exp: ... }
    // We attach it to req so every controller can access req.user.id
    req.user = decoded;

    next(); // ← proceed to the actual route controller
  } catch (err) {
    // JsonWebTokenError  = tampered or invalid token
    // TokenExpiredError  = token is older than 7 days
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};