// backend/controllers/userController.js
//
// Handles user profile operations.
//
//   GET  /api/users/me         → get logged-in user's profile
//   PUT  /api/users/profile    → update name
//   PUT  /api/users/password   → change password (requires current password)

const bcrypt = require('bcryptjs');
const pool   = require('../config/db');

// ─────────────────────────────────────────────
// GET MY PROFILE
// GET /api/users/me
// Returns user info without the password field
// ─────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    // req.user.id comes from authMiddleware (decoded JWT)
    // We SELECT specific columns — never SELECT * when password is in the table
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json(rows[0]);

  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

// ─────────────────────────────────────────────
// UPDATE PROFILE (name only)
// PUT /api/users/profile
// Body: { name }
// Email is intentionally not updatable here (needs extra verification flow)
// ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const userId   = req.user.id;

    // ── Validate ──────────────────────────────
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    await pool.query(
      'UPDATE users SET name = ? WHERE id = ?',
      [name.trim(), userId]
    );

    // Return the updated user object so the frontend can update Redux state
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: rows[0],
    });

  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// PUT /api/users/password
// Body: { currentPassword, newPassword }
// User must prove they know the old password before setting a new one
// ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // ── Validate ──────────────────────────────
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    // ── Fetch current hashed password from DB ─
    // We need SELECT * here (or include password) because we need to compare it
    const [rows] = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // ── Verify current password ───────────────
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // ── Hash and save new password ────────────
    const hashedNew = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNew, userId]
    );

    return res.status(200).json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
};