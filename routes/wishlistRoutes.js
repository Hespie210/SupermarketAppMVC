// routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { checkNonAdmin } = require('../middleware/authMiddleware');

router.get('/wishlist', checkNonAdmin, wishlistController.showWishlist);
router.post('/wishlist/add/:id', checkNonAdmin, wishlistController.addToWishlist);
router.post('/wishlist/remove/:id', checkNonAdmin, wishlistController.removeFromWishlist);

module.exports = router;
