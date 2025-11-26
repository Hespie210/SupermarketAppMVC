// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const productController = require('../controllers/productController');
const { checkAuthenticated, checkAdmin, checkNonAdmin } = require('../middleware/authMiddleware');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Shopping page for users
router.get('/shopping', checkNonAdmin, productController.showShopping);

// Product details
router.get('/product/:id', checkNonAdmin, productController.showProductDetails);

// Admin inventory
router.get('/inventory', checkAuthenticated, checkAdmin, productController.showInventory);
router.post('/inventory/:id/quantity', checkAuthenticated, checkAdmin, productController.updateQuantity);

// Admin add product
router.get('/addProduct', checkAuthenticated, checkAdmin, productController.showAddProduct);
router.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), productController.addProduct);

// Admin update product
router.get('/updateProduct/:id', checkAuthenticated, checkAdmin, productController.showUpdateProduct);
router.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), productController.updateProduct);

// Admin delete product
router.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, productController.deleteProduct);

module.exports = router;
