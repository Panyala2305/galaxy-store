// backend/controllers/cartController.js
//
// Handles all shopping cart operations for the logged-in user.
// Every route here is protected by authMiddleware, so req.user.id is always available.
//
//   GET    /api/cart              → get all cart items with product details
//   POST   /api/cart/add          → add item or increase quantity if already exists
//   PUT    /api/cart/update/:id   → change quantity of a specific cart row
//   DELETE /api/cart/remove/:id   → remove one item from cart
//   DELETE /api/cart/clear        → remove ALL items (called after order is placed)

const pool = require('../config/db');

// ─────────────────────────────────────────────
// GET CART
// GET /api/cart
// Returns all cart items joined with product details for the logged-in user
// ─────────────────────────────────────────────
exports.getCart = async (req, res) => {
  try {
    // JOIN cart with products so the frontend gets name, price, image in one call
    // instead of making a separate request for each product
    const [rows] = await pool.query(
      `SELECT
         c.id        AS cart_id,
         c.quantity,
         p.id        AS product_id,
         p.name,
         p.price,
         p.image,
         p.stock
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?
       ORDER BY c.id DESC`,
      [req.user.id]
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('getCart error:', err);
    return res.status(500).json({ error: 'Failed to fetch cart.' });
  }
};

// ─────────────────────────────────────────────
// ADD TO CART
// POST /api/cart/add
// Body: { productId, quantity }
// If item already in cart → increase quantity
// If new item → insert fresh row
// ─────────────────────────────────────────────
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // ── Validate ──────────────────────────────
    if (!productId) {
      return res.status(400).json({ error: 'productId is required.' });
    }
    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    // ── Check product exists and has stock ────
    const [products] = await pool.query(
      'SELECT id, name, price, image, stock FROM products WHERE id = ?',
      [productId]
    );
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const product = products[0];
    if (product.stock < quantity) {
      return res.status(400).json({ error: `Only ${product.stock} units available.` });
    }

    // ── Check if already in cart ──────────────
    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    let cartId;
    let newQuantity;

    if (existing.length > 0) {
      // Item already in cart — just add to the existing quantity
      newQuantity = existing[0].quantity + quantity;
      cartId = existing[0].id;

      // Make sure we don't exceed available stock
      if (newQuantity > product.stock) {
        return res.status(400).json({
          error: `Cannot add more. Only ${product.stock} units in stock.`,
        });
      }

      await pool.query(
        'UPDATE cart SET quantity = ? WHERE id = ?',
        [newQuantity, cartId]
      );
    } else {
      // New item — insert a fresh cart row
      newQuantity = quantity;
      const [result] = await pool.query(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, productId, quantity]
      );
      cartId = result.insertId;
    }

    return res.status(200).json({
      message: 'Added to cart.',
      item: {
        cart_id:    cartId,
        product_id: product.id,
        name:       product.name,
        price:      product.price,
        image:      product.image,
        quantity:   newQuantity,
      },
    });
  } catch (err) {
    console.error('addToCart error:', err);
    return res.status(500).json({ error: 'Failed to add to cart.' });
  }
};

// ─────────────────────────────────────────────
// UPDATE QUANTITY
// PUT /api/cart/update/:id
// Params: id = cart row id
// Body:   { quantity }  — new quantity (0 = remove the item)
// ─────────────────────────────────────────────
exports.updateCartQuantity = async (req, res) => {
  try {
    const cartId  = req.params.id;
    const { quantity } = req.body;
    const userId  = req.user.id;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity is required.' });
    }

    // Make sure this cart row belongs to the logged-in user (security check)
    // Without this, a user could modify another user's cart by guessing cart IDs
    const [rows] = await pool.query(
      'SELECT id FROM cart WHERE id = ? AND user_id = ?',
      [cartId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    if (quantity === 0) {
      // Treat quantity 0 as a remove
      await pool.query('DELETE FROM cart WHERE id = ?', [cartId]);
      return res.status(200).json({ message: 'Item removed.', cartId: Number(cartId), quantity: 0 });
    }

    await pool.query('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, cartId]);

    return res.status(200).json({
      message: 'Quantity updated.',
      cartId:   Number(cartId),
      quantity,
    });
  } catch (err) {
    console.error('updateCartQuantity error:', err);
    return res.status(500).json({ error: 'Failed to update quantity.' });
  }
};

// ─────────────────────────────────────────────
// REMOVE ITEM
// DELETE /api/cart/remove/:id
// Params: id = cart row id
// ─────────────────────────────────────────────
exports.removeFromCart = async (req, res) => {
  try {
    const cartId = req.params.id;
    const userId = req.user.id;

    // Ownership check — user can only delete their own cart rows
    const [rows] = await pool.query(
      'SELECT id FROM cart WHERE id = ? AND user_id = ?',
      [cartId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    await pool.query('DELETE FROM cart WHERE id = ?', [cartId]);

    return res.status(200).json({ message: 'Item removed from cart.' });
  } catch (err) {
    console.error('removeFromCart error:', err);
    return res.status(500).json({ error: 'Failed to remove item.' });
  }
};

// ─────────────────────────────────────────────
// CLEAR ENTIRE CART
// DELETE /api/cart/clear
// Called automatically after a successful order placement
// ─────────────────────────────────────────────
exports.clearCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ message: 'Cart cleared.' });
  } catch (err) {
    console.error('clearCart error:', err);
    return res.status(500).json({ error: 'Failed to clear cart.' });
  }
};