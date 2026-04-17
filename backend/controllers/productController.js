const pool = require('../config/db');

exports.getProducts = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchProducts = async (req, res) => {
    const { q } = req.query;
    const [rows] = await pool.query(
        'SELECT * FROM products WHERE name LIKE ?',
        [`%${q}%`]
    );
    res.json(rows);
};