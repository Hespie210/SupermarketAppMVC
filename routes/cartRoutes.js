// routes/cartRoutes.js
// Cart, checkout, and payment routes for users.
const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const netsController = require('../controllers/netsController');
const { checkAuthenticated, checkNonAdmin } = require('../middleware/authMiddleware');

// View cart
router.get('/cart', checkNonAdmin, cartController.showCart);

// Add to cart
router.post('/add-to-cart/:id', checkNonAdmin, cartController.addToCart);

// Remove item from cart
router.post('/cart/remove/:id', checkNonAdmin, cartController.removeFromCart);

// Update item quantity
router.post('/cart/update/:id', checkNonAdmin, cartController.updateItemQuantity);

// Clear entire cart
router.post('/cart/clear', checkNonAdmin, cartController.clearCart);

// Checkout
router.post('/checkout', checkNonAdmin, cartController.checkout);

// PayPal (sandbox)
router.post('/paypal/create-order', checkNonAdmin, cartController.createPaypalOrder);
router.post('/paypal/capture-order', checkNonAdmin, cartController.capturePaypalOrder);

// Stripe
router.post('/stripe/create-checkout-session', checkNonAdmin, cartController.createStripeCheckoutSession);
router.get('/stripe/success', checkNonAdmin, cartController.stripeSuccess);
router.get('/stripe/cancel', checkNonAdmin, cartController.stripeCancel);

// NETS QR
router.get('/nets-qr', checkNonAdmin, netsController.showNetsQr);
router.get('/nets-qr/status', checkNonAdmin, netsController.checkNetsStatus);

// View receipts / purchase history (for current user)
router.get('/my-purchases', checkNonAdmin, cartController.showPurchases);
router.post('/my-purchases/:orderId/refund-request', checkNonAdmin, cartController.requestRefund);

// View detailed receipt for one checkout
router.get(
  '/my-purchases/:orderId',
  checkNonAdmin,
  cartController.showReceiptDetails
);

// Invoice view after checkout
router.get('/invoice/:orderId', checkNonAdmin, cartController.showReceiptDetails);

module.exports = router;
