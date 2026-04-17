// backend/controllers/orderController.js
//
// Handles order placement and order history retrieval.
//
//   POST /api/orders        → place a new order from cart items
//   GET  /api/orders        → get all orders for the logged-in user (with items)
//   GET  /api/orders/:id    → get a single order's full details

const pool = require('../config/db');

// ─────────────────────────────────────────────
// PLACE ORDER
// POST /api/orders
// Body: { items: [{ productId, quantity, price }], totalPrice }
//
// Steps:
//   1. Validate items array
//   2. Verify stock for every item in one go
//   3. Open a DB transaction (all-or-nothing insert)
//   4. Create the order row
//   5. Insert all order_items rows
//   6. Deduct stock from products table
//   7. Clear the user's cart
//   8. Commit transaction
// ─────────────────────────────────────────────
exports.placeOrder = async (req, res) => {
  // Get a connection from the pool so we can run a transaction
  // A transaction means: if ANY query fails, ALL changes are rolled back
  // This prevents situations like "order created but stock not deducted"
  const conn = await pool.getConnection();

  try {
    const { items, totalPrice } = req.body;
    const userId = req.user.id;

    // ── Validate ──────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }
    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({ error: 'Invalid total price.' });
    }

    // ── Check stock for all items before doing anything ──
    // We check everything upfront so we don't partially create an order
    for (const item of items) {
      const [rows] = await conn.query(
        'SELECT id, name, stock FROM products WHERE id = ?',
        [item.productId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: `Product ID ${item.productId} not found.` });
      }
      if (rows[0].stock < item.quantity) {
        return res.status(400).json({
          error: `"${rows[0].name}" only has ${rows[0].stock} units left in stock.`,
        });
      }
    }

    // ── Begin transaction ─────────────────────
    await conn.beginTransaction();

    // ── Step 1: Create the order row ──────────
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'pending')`,
      [userId, totalPrice]
    );
    const orderId = orderResult.insertId;

    // ── Step 2: Insert each order_item row ────
    // Build values array for a bulk INSERT (faster than a loop of individual queries)
    // Format: INSERT INTO order_items VALUES (orderId, pid, qty, price), (orderId, ...), ...
    const orderItemsValues = items.map(item => [
      orderId,
      item.productId,
      item.quantity,
      item.price,
    ]);

    await conn.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
      [orderItemsValues]
      // Note: 'VALUES ?' with an array of arrays is mysql2's bulk insert syntax
    );

    // ── Step 3: Deduct stock ──────────────────
    // Reduce product stock by quantity ordered
    // We update one product at a time — fine for typical order sizes
    for (const item of items) {
      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    // ── Step 4: Clear the user's cart ─────────
    await conn.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    // ── Commit — save all changes permanently ─
    await conn.commit();

    return res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
    });

  } catch (err) {
    // If anything went wrong, roll back ALL changes
    // The DB returns to exactly the state it was before we started
    await conn.rollback();
    console.error('placeOrder error:', err);
    return res.status(500).json({ error: 'Failed to place order. Please try again.' });
  } finally {
    // ALWAYS release the connection back to the pool, even if an error occurred
    conn.release();
  }
};

// ─────────────────────────────────────────────
// GET ALL ORDERS  (order history)
// GET /api/orders
// Returns all orders for the logged-in user, newest first.
// Each order includes its items with product name and image.
// ─────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    // ── Fetch all orders ──────────────────────
    const [orders] = await pool.query(
      `SELECT id, total_price, status, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    if (orders.length === 0) {
      return res.status(200).json([]);
    }

    // ── Fetch items for all orders in one query ──
    // Extract just the order IDs: [1, 2, 5, 9, ...]
    const orderIds = orders.map(o => o.id);

    // IN (?) with an array is mysql2's way of doing WHERE id IN (1, 2, 3)
    const [items] = await pool.query(
      `SELECT
         oi.order_id,
         oi.quantity,
         oi.price,
         p.id    AS product_id,
         p.name,
         p.image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (?)`,
      [orderIds]
    );

    // ── Combine: attach items array to each order ──
    // Build a Map for O(1) lookup instead of nested loops
    const itemsByOrderId = {};
    items.forEach(item => {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(item);
    });

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemsByOrderId[order.id] || [],
    }));

    return res.status(200).json(ordersWithItems);

  } catch (err) {
    console.error('getOrders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE ORDER
// GET /api/orders/:id
// Returns full details of one order (only if it belongs to the user)
// ─────────────────────────────────────────────
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId  = req.user.id;

    // Fetch the order — AND check it belongs to this user
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Fetch the order's items
    const [items] = await pool.query(
      `SELECT
         oi.quantity,
         oi.price,
         p.id    AS product_id,
         p.name,
         p.image,
         p.description
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return res.status(200).json({ ...orders[0], items });

  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ error: 'Failed to fetch order.' });
  }
};