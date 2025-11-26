// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { checkAuthenticated, checkAdmin } = require('../middleware/authMiddleware');

router.get('/admin/users', checkAuthenticated, checkAdmin, adminController.showUsers);
router.post('/admin/users/delete/:id', checkAuthenticated, checkAdmin, adminController.deleteUser);

// Admin view of all receipts
router.get('/admin/purchases', checkAuthenticated, checkAdmin, adminController.showAllPurchases);

// Admin: detailed view of a single receipt
router.get(
  '/admin/purchases/:userId/:timestamp',
  checkAuthenticated,
  checkAdmin,
  adminController.showReceiptDetails
);
module.exports = router;
