// routes/cartRoutes.js
const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const { checkAuthenticated, checkNonAdmin } = require('../middleware/authMiddleware');

// View cart
router.get('/cart', checkNonAdmin, cartController.showCart);

// Add to cart
router.post('/add-to-cart/:id', checkNonAdmin, cartController.addToCart);

// Remove item from cart
router.post('/cart/remove/:id', checkNonAdmin, cartController.removeFromCart);

// Clear entire cart
router.post('/cart/clear', checkNonAdmin, cartController.clearCart);

// Checkout
router.post('/checkout', checkNonAdmin, cartController.checkout);

// View receipts / purchase history (for current user)
router.get('/my-purchases', checkNonAdmin, cartController.showPurchases);

// View detailed receipt for one checkout
router.get(
  '/my-purchases/:orderId',
  checkNonAdmin,
  cartController.showReceiptDetails
);

module.exports = router;
