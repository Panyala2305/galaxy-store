// backend/controllers/authController.js
//
// Handles all authentication logic:
//   POST /api/auth/register  → create new user
//   POST /api/auth/login     → verify user, set JWT cookie
//   POST /api/auth/logout    → clear JWT cookie
//   GET  /api/auth/me        → return logged-in user info (used on app load)
//
// Flow:
//   Register: validate input → check duplicate email → hash password → save to DB
//   Login:    find user by email → compare password hash → sign JWT → set HttpOnly cookie
//   Logout:   clear the cookie
//   Me:       read req.user (set by authMiddleware) → return user from DB

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// ─────────────────────────────────────────────
// HELPER — set JWT as HttpOnly cookie
// Extracted into a helper so both register and login use identical cookie settings
// ─────────────────────────────────────────────
const sendTokenCookie = (res, userId, email) => {
  // jwt.sign() creates a signed token string
  // Payload { id, email } is embedded IN the token (not secret, just signed)
  // JWT_SECRET is used to sign — anyone with the secret can verify it's authentic
  const token = jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }  // token expires in 7 days
  );

  res.cookie('token', token, {
    httpOnly: true,   // ← JS in the browser CANNOT read this cookie (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',  // protects against CSRF while allowing normal navigation
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  return token;
};

// ─────────────────────────────────────────────
// REGISTER
// POST /api/auth/register
// Body: { name, email, password }
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ── Step 1: Validate input ──────────────────
    // Never trust data from the frontend — always validate on the backend too
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    // Basic email format check (regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // ── Step 2: Check if email already exists ───
    // pool.query() returns [rows, fields] — we destructure just rows
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      // 409 Conflict — resource already exists
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // ── Step 3: Hash the password ───────────────
    // bcrypt.hash(password, saltRounds)
    // saltRounds = 10 means bcrypt runs 2^10 = 1024 iterations
    // Higher = more secure but slower. 10-12 is the industry standard.
    // NEVER store plain text passwords.
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Step 4: Insert user into DB ─────────────
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    // result.insertId is the auto-incremented ID MySQL gave the new row
    const userId = result.insertId;

    // ── Step 5: Sign JWT and set cookie ─────────
    sendTokenCookie(res, userId, email);

    // ── Step 6: Send response ───────────────────
    // 201 Created — the standard status code for a newly created resource
    return res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id:    userId,
        name:  name.trim(),
        email: email.toLowerCase().trim(),
      },
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// LOGIN
// POST /api/auth/login
// Body: { email, password }
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Step 1: Validate input ──────────────────
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // ── Step 2: Find user by email ──────────────
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // IMPORTANT: Use a vague error message like "Invalid credentials"
    // instead of "Email not found" — this prevents user enumeration attacks
    // (an attacker could otherwise figure out which emails are registered)
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0]; // the user object from DB

    // ── Step 3: Compare password with stored hash ──
    // bcrypt.compare() hashes the plain password and compares it to the stored hash
    // Returns true if they match, false if not
    // This is safe against timing attacks (unlike === string comparison)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // ── Step 4: Sign JWT and set cookie ─────────
    sendTokenCookie(res, user.id, user.email);

    // ── Step 5: Send response ───────────────────
    // Never send the hashed password back to the client
    return res.status(200).json({
      message: 'Login successful!',
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// LOGOUT
// POST /api/auth/logout
// No body needed — just clears the cookie
// ─────────────────────────────────────────────
exports.logout = (req, res) => {
  // Overwrite the cookie with an empty value and maxAge: 0 → browser deletes it immediately
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // expire immediately
  });

  return res.status(200).json({ message: 'Logged out successfully.' });
};

// ─────────────────────────────────────────────
// GET CURRENT USER  (called on app load)
// GET /api/auth/me
// Protected — requires valid JWT cookie (authMiddleware sets req.user)
// ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    // req.user is set by authMiddleware after verifying the JWT
    // It contains { id, email } from the token payload
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Return fresh data from DB (in case name was updated)
    return res.status(200).json(rows[0]);

  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};