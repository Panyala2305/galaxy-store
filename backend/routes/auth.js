// backend/routes/auth.js
//
// Mounts auth controller functions onto URL paths.
// All routes here are prefixed with /api/auth (set in server.js)
//
// Public routes  (no auth needed): register, login
// Protected route (needs JWT cookie): /me

const router = require('express').Router();
const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me  ← protected
router.get('/me', authMiddleware, getMe);

module.exports = router;