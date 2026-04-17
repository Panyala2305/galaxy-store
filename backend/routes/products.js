const router = require('express').Router();
const { getProducts, searchProducts } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/search', searchProducts);

module.exports = router;