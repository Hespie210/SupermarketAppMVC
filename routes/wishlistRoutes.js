// routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

router.get('/wishlist', checkAuthenticated, wishlistController.showWishlist);
router.post('/wishlist/add/:id', checkAuthenticated, wishlistController.addToWishlist);
router.post('/wishlist/remove/:id', checkAuthenticated, wishlistController.removeFromWishlist);

module.exports = router;
