// backend/controllers/paymentController.js
//
// Handles the two-step Razorpay payment flow:
//
//  STEP 1 — Create Razorpay Order (before payment)
//  POST /api/payment/create-order
//  → Frontend calls this when user clicks "Proceed to Pay"
//  → We create a Razorpay "order" (just a payment session, NOT a DB order yet)
//  → Razorpay returns an order_id that the frontend uses to open the payment popup
//
//  STEP 2 — Verify Payment + Save Order (after payment)
//  POST /api/payment/verify
//  → Razorpay calls this via frontend after payment succeeds
//  → We verify the payment signature (proves Razorpay actually processed it)
//  → Only THEN do we save the order to our database
//  → This prevents fake/manipulated payment confirmations
//
// WHY TWO STEPS?
//  Never trust the frontend for payment confirmation.
//  A malicious user could skip Razorpay and directly call your "save order" endpoint.
//  The signature verification in Step 2 is cryptographic proof from Razorpay's servers.

const Razorpay = require('razorpay');
const crypto   = require('crypto'); // built into Node.js — no install needed
const pool     = require('../config/db');

// Initialize Razorpay with your API keys from .env
// These keys are like a username+password for Razorpay's API
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────
// STEP 1: CREATE RAZORPAY ORDER
// POST /api/payment/create-order
// Body: { amount, cartItems }
// Called when user clicks "Proceed to Pay" on the cart page
// ─────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { amount, cartItems } = req.body;

    // ── Validate ──────────────────────────────
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    // ── IMPORTANT: Recalculate price server-side ──
    // NEVER trust the amount sent from the frontend.
    // A user could open DevTools and change the price to ₹1.
    // We recalculate the real total from the DB.
    const productIds = cartItems.map(i => i.product_id);
    const [products] = await pool.query(
      `SELECT id, price, stock FROM products WHERE id IN (?)`,
      [productIds]
    );

    // Build a price map: { productId: price }
    const priceMap = {};
    products.forEach(p => { priceMap[p.id] = p.price; });

    // Calculate the real server-side total
    let serverTotal = 0;
    for (const item of cartItems) {
      if (!priceMap[item.product_id]) {
        return res.status(400).json({ error: `Product ${item.product_id} not found.` });
      }
      serverTotal += priceMap[item.product_id] * item.quantity;
    }

    // Round to avoid floating point issues: 1299.999... → 1300
    serverTotal = Math.round(serverTotal * 100) / 100;

    // ── Create Razorpay order ─────────────────
    // Razorpay amounts are in PAISE (smallest unit), not rupees
    // ₹1299 = 129900 paise
    const razorpayOrder = await razorpay.orders.create({
      amount:   Math.round(serverTotal * 100), // convert ₹ to paise
      currency: 'INR',
      receipt:  `receipt_${req.user.id}_${Date.now()}`, // unique receipt ID
      notes: {
        userId: req.user.id,  // store for reference
      },
    });

    // Send back what the frontend needs to open the Razorpay popup
    return res.status(200).json({
      razorpayOrderId: razorpayOrder.id,   // e.g. "order_PxxxxxxxxxxxxY"
      amount:          serverTotal,         // in rupees (for display)
      amountInPaise:   razorpayOrder.amount, // in paise (for Razorpay SDK)
      currency:        'INR',
      keyId:           process.env.RAZORPAY_KEY_ID, // frontend needs this to init Razorpay
    });

  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create payment order.' });
  }
};

// ─────────────────────────────────────────────
// STEP 2: VERIFY PAYMENT + SAVE ORDER TO DB
// POST /api/payment/verify
// Body: {
//   razorpay_order_id,    ← from Razorpay after payment
//   razorpay_payment_id,  ← unique payment ID
//   razorpay_signature,   ← cryptographic proof from Razorpay
//   cartItems,            ← items to save as order_items
//   totalPrice            ← total (will re-verify server-side)
// }
// ─────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  const conn = await pool.getConnection(); // for transaction

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartItems,
      totalPrice,
    } = req.body;

    const userId = req.user.id;

    // ── Validate required fields ──────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification data is incomplete.' });
    }

    // ── SIGNATURE VERIFICATION ────────────────
    // This is the most critical security check.
    //
    // How it works:
    //   Razorpay creates a signature by combining order_id + payment_id
    //   and signing it with YOUR secret key using HMAC-SHA256.
    //
    //   We recreate the same signature on our server.
    //   If they match → payment is genuine.
    //   If they don't → someone tampered with the data (reject!).
    //
    // An attacker cannot fake this signature without knowing your secret key.

    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      console.error('Payment signature mismatch — possible tamper attempt');
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // ── Signature is valid — save the order ───
    // Now it's safe to create the order in our database.
    // From here it's identical to the original placeOrder flow.

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'No items to order.' });
    }

    // Recalculate server-side total one more time (belt AND suspenders)
    const productIds = cartItems.map(i => i.product_id);
    const [products] = await pool.query(
      `SELECT id, price, stock, name FROM products WHERE id IN (?)`,
      [productIds]
    );
    const priceMap = {};
    const stockMap = {};
    products.forEach(p => {
      priceMap[p.id] = p.price;
      stockMap[p.id] = { stock: p.stock, name: p.name };
    });

    // Check stock one more time (someone else might have bought last item during payment)
    for (const item of cartItems) {
      if (stockMap[item.product_id].stock < item.quantity) {
        return res.status(400).json({
          error: `Sorry, "${stockMap[item.product_id].name}" just went out of stock. Please contact support with payment ID: ${razorpay_payment_id}`,
        });
      }
    }

    const serverTotal = cartItems.reduce(
      (sum, item) => sum + (priceMap[item.product_id] * item.quantity), 0
    );

    // ── Begin DB Transaction ──────────────────
    await conn.beginTransaction();

    // 1. Create the order row — status is 'paid' immediately
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_price, status, payment_id, razorpay_order_id)
       VALUES (?, ?, 'paid', ?, ?)`,
      [userId, Math.round(serverTotal * 100) / 100, razorpay_payment_id, razorpay_order_id]
    );
    const orderId = orderResult.insertId;

    // 2. Insert order_items (bulk insert)
    const orderItemsValues = cartItems.map(item => [
      orderId,
      item.product_id,
      item.quantity,
      priceMap[item.product_id], // always use server price, never frontend price
    ]);
    await conn.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
      [orderItemsValues]
    );

    // 3. Deduct stock
    for (const item of cartItems) {
      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // 4. Clear cart
    await conn.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    await conn.commit();

    return res.status(201).json({
      message: 'Payment successful! Order placed.',
      orderId,
      paymentId: razorpay_payment_id,
    });

  } catch (err) {
    await conn.rollback();
    console.error('verifyPayment error:', err);
    return res.status(500).json({ error: 'Payment verified but order saving failed. Contact support.' });
  } finally {
    conn.release();
  }
};