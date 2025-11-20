// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

router.get('/cart', checkAuthenticated, cartController.showCart);
router.post('/add-to-cart/:id', checkAuthenticated, cartController.addToCart);
router.post('/cart/remove/:id', checkAuthenticated, cartController.removeFromCart);
router.post('/cart/clear', checkAuthenticated, cartController.clearCart);
router.post('/checkout', checkAuthenticated, cartController.checkout);
router.get('/my-purchases', checkAuthenticated, cartController.showPurchases);

module.exports = router;
