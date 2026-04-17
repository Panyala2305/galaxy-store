// backend/routes/users.js
// All routes prefixed with /api/users (registered in server.js)
// Every route is protected — user must be logged in

const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  changePassword,
} = require('../controllers/userController');

// GET /api/users/me           → get logged-in user's profile info
router.get('/me',       auth, getProfile);

// PUT /api/users/profile      → update display name
router.put('/profile',  auth, updateProfile);

// PUT /api/users/password     → change password (requires current password)
router.put('/password', auth, changePassword);

module.exports = router;