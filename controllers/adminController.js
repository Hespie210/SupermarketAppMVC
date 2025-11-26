// controllers/adminController.js
const User = require('../models/userModel');
const Purchase = require('../models/purchaseModel');

const adminController = {
  // Admin: view all users
  showUsers: (req, res) => {
    User.getAllUsers((err, results) => {
      if (err) {
        console.error('Error loading users:', err);
        return res.status(500).send('Error loading users');
      }
      res.render('adminUsers', { users: results });
    });
  },

  // Admin: delete user (do not delete yourself)
  deleteUser: (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (req.session.user && req.session.user.id === id) {
      // prevent deleting own account
      return res.redirect('/admin/users');
    }

    User.deleteUserById(id, err => {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).send('Error deleting user');
      }
      res.redirect('/admin/users');
    });
  },

  // Admin: view all purchase lines
  showAllPurchases: (req, res) => {
    Purchase.getAllPurchasesWithUsers((err, purchases) => {
      if (err) {
        console.error('Error loading purchases:', err);
        return res.status(500).send('Error loading purchases');
      }

      res.render('adminPurchases', { purchases });
    });
  },

  // Admin: detailed receipt view for a particular user + checkout
  showReceiptDetails: (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const receiptTimestamp = parseInt(req.params.timestamp, 10);

    Purchase.getReceiptDetails(userId, receiptTimestamp, (err, items) => {
      if (err) {
        console.error('Error loading admin receipt details:', err);
        return res.status(500).send('Error loading receipt');
      }

      if (!items || !items.length) {
        return res.status(404).send('Receipt not found');
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
      );

      // Reuse same view as user
      res.render('receiptDetails', {
        items,
        totalAmount,
        receiptDate: items[0].createdAt,
        orderNumber: receiptTimestamp,
        paymentMethod: 'N/A'
      });
    });
  }
};

module.exports = adminController;
