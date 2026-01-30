// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { checkAuthenticated, checkAdmin } = require('../middleware/authMiddleware');

router.get('/admin/dashboard', checkAuthenticated, checkAdmin, adminController.showDashboard);
router.post('/admin/orders/:orderId/status', checkAuthenticated, checkAdmin, adminController.updateOrderStatus);
router.post('/admin/orders/:orderId/refund', checkAuthenticated, checkAdmin, adminController.refundOrder);
router.post('/admin/orders/:orderId/refund-reject', checkAuthenticated, checkAdmin, adminController.rejectRefundRequest);
router.get('/admin/users', checkAuthenticated, checkAdmin, adminController.showUsers);
router.get('/admin/users/create', checkAuthenticated, checkAdmin, adminController.showCreateUser);
router.post('/admin/users/create', checkAuthenticated, checkAdmin, adminController.createUser);
router.get('/admin/users/:id', checkAuthenticated, checkAdmin, adminController.showUserDetails);
router.get('/admin/users/:id/edit', checkAuthenticated, checkAdmin, adminController.showEditUser);
router.post('/admin/users/:id/edit', checkAuthenticated, checkAdmin, adminController.updateUser);
router.post('/admin/users/delete/:id', checkAuthenticated, checkAdmin, adminController.deleteUser);

// Admin view of all receipts
router.get('/admin/purchases', checkAuthenticated, checkAdmin, adminController.showAllPurchases);

// Admin: detailed view of a single receipt
router.get(
  '/admin/purchases/:orderId',
  checkAuthenticated,
  checkAdmin,
  adminController.showReceiptDetails
);
module.exports = router;
