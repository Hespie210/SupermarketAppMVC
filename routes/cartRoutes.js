// routes/cartRoutes.js
const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// View cart
router.get('/cart', checkAuthenticated, cartController.showCart);

// Add to cart
router.post('/add-to-cart/:id', checkAuthenticated, cartController.addToCart);

// Remove item from cart
router.post('/cart/remove/:id', checkAuthenticated, cartController.removeFromCart);

// Clear entire cart
router.post('/cart/clear', checkAuthenticated, cartController.clearCart);

// Checkout
router.post('/checkout', checkAuthenticated, cartController.checkout);

// View receipts / purchase history (for current user)
router.get('/my-purchases', checkAuthenticated, cartController.showPurchases);

// View detailed receipt for one checkout
router.get(
  '/my-purchases/:timestamp',
  checkAuthenticated,
  cartController.showReceiptDetails
);

module.exports = router;
