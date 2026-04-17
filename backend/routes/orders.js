// backend/routes/orders.js
// All routes prefixed with /api/orders (registered in server.js)
// Every route is protected — user must be logged in

const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const {
  placeOrder,
  getOrders,
  getOrderById,
} = require('../controllers/orderController');

// POST /api/orders        → place a new order from cart items
router.post('/',    auth, placeOrder);

// GET  /api/orders        → get all orders for logged-in user (order history)
router.get('/',     auth, getOrders);

// GET  /api/orders/:id    → get single order with all its items
router.get('/:id',  auth, getOrderById);

module.exports = router;