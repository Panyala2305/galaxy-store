// backend/routes/payment.js
// All routes prefixed with /api/payment (registered in server.js)

const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const {
  createOrder,
  verifyPayment,
} = require('../controllers/paymentController');

// POST /api/payment/create-order  → Step 1: get Razorpay order ID
router.post('/create-order', auth, createOrder);

// POST /api/payment/verify        → Step 2: verify signature + save order to DB
router.post('/verify', auth, verifyPayment);

module.exports = router;