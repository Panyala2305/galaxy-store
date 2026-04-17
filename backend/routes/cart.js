// backend/routes/cart.js
// All routes prefixed with /api/cart (registered in server.js)
// Every route is protected — user must be logged in

const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');

// GET    /api/cart              → fetch all cart items with product details
router.get('/',            auth, getCart);

// POST   /api/cart/add          → add product to cart (or increase qty if exists)
router.post('/add',        auth, addToCart);

// PUT    /api/cart/update/:id   → update quantity of a specific cart row
router.put('/update/:id',  auth, updateCartQuantity);

// DELETE /api/cart/remove/:id   → remove one specific item
router.delete('/remove/:id', auth, removeFromCart);

// DELETE /api/cart/clear        → remove all items (after order placed)
router.delete('/clear',    auth, clearCart);

module.exports = router;