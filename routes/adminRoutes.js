// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { checkAuthenticated, checkAdmin } = require('../middleware/authMiddleware');

router.get('/admin/users', checkAuthenticated, checkAdmin, adminController.showUsers);
router.post('/admin/users/delete/:id', checkAuthenticated, checkAdmin, adminController.deleteUser);

module.exports = router;