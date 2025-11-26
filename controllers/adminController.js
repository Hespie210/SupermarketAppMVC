// controllers/adminController.js
const User = require('../models/userModel');
const Order = require('../models/orderModel');

const STATUS_VALUES = [
  'Processing',
  'Packing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
  'Failed Payment',
  'Refunded'
];

const adminController = {
  showDashboard: (req, res) => {
    User.getUserCount((errUser, totalUsers) => {
      if (errUser) {
        console.error('Error loading user count:', errUser);
        return res.status(500).send('Error loading dashboard');
      }

      Order.getAllOrdersWithUsers((errOrders, orders) => {
        if (errOrders) {
          console.error('Error loading orders:', errOrders);
          return res.status(500).send('Error loading dashboard');
        }

        const totalOrders = orders ? orders.length : 0;
        const totalRevenue = (orders || []).reduce(
          (sum, o) => sum + Number(o.totalAmount || 0),
          0
        );

        // status breakdown
        const statusCounts = STATUS_VALUES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
        (orders || []).forEach(o => {
          const status = o.status || 'Processing';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        res.render('adminDashboard', {
          totalUsers,
          totalOrders,
          totalRevenue,
          orders,
          statusCounts,
          statuses: STATUS_VALUES
        });
      });
    });
  },

  updateOrderStatus: (req, res) => {
    const orderId = parseInt(req.params.orderId, 10);
    const newStatus = (req.body.status || '').trim();

    if (!STATUS_VALUES.includes(newStatus)) {
      req.flash('error', 'Invalid status selected.');
      return res.redirect('/admin/dashboard');
    }

    Order.updateStatus(orderId, newStatus, (err) => {
      if (err) {
        console.error('Error updating order status:', err);
        req.flash('error', 'Failed to update status.');
      } else {
        req.flash('success', 'Order status updated.');
      }
      res.redirect('/admin/dashboard');
    });
  },

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
    Order.getAllOrdersWithUsers((err, orders) => {
      if (err) {
        console.error('Error loading purchases:', err);
        return res.status(500).send('Error loading purchases');
      }

      res.render('adminPurchases', { purchases: orders });
    });
  },

  // Admin: detailed receipt view for a particular user + checkout
  showReceiptDetails: (req, res) => {
    const orderId = parseInt(req.params.orderId, 10);

    Order.getOrderDetailsForAdmin(orderId, (err, items) => {
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
        orderNumber: orderId,
        paymentMethod: 'N/A'
      });
    });
  }
};

module.exports = adminController;
