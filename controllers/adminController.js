// controllers/adminController.js
const bcrypt = require('bcryptjs');
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

  showCreateUser: (req, res) => {
    res.render('adminCreateUser');
  },

  createUser: (req, res) => {
    const { username, email, password, address, contact, role } = req.body;
    const allowedRoles = ['admin', 'user'];
    const finalRole = allowedRoles.includes(role) ? role : 'user';

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password (admin create):', err);
        req.flash('error', 'Unable to create user.');
        return res.redirect('/admin/users/create');
      }

      User.createUser(username, email, hashedPassword, address, contact, finalRole, (err2) => {
        if (err2) {
          console.error('Error creating user (admin):', err2);
          req.flash('error', 'Unable to create user.');
          return res.redirect('/admin/users/create');
        }
        req.flash('success', 'User created.');
        res.redirect('/admin/users');
      });
    });
  },

  showEditUser: (req, res) => {
    const id = parseInt(req.params.id, 10);
    User.getUserById(id, (err, user) => {
      if (err || !user) {
        return res.status(404).send('User not found');
      }
      res.render('editUser', { user });
    });
  },

  updateUser: (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { username, email, role } = req.body;

    User.updateUser(id, { username, email, role }, (err) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).send('Error updating user');
      }
      res.redirect('/admin/users');
    });
  },

  // Admin: delete user (do not delete yourself)
  deleteUser: (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (req.session.user && req.session.user.id === id) {
      // prevent deleting own account
      return res.redirect('/admin/users');
    }

    User.getUserById(id, (err, user) => {
      if (err || !user) {
        console.error('Error finding user for delete:', err);
        req.flash('error', 'User not found.');
        return res.redirect('/admin/users');
      }

      if (user.role === 'admin') {
        req.flash('error', 'Cannot delete an admin account.');
        return res.redirect('/admin/users');
      }

      User.deleteUserById(id, errDel => {
        if (errDel) {
          console.error('Error deleting user:', errDel);
          req.flash('error', 'Error deleting user.');
          return res.redirect('/admin/users');
        }
        req.flash('success', 'User deleted.');
        res.redirect('/admin/users');
      });
    });
  },

  // Admin: view all purchase lines
  showAllPurchases: (req, res) => {
    const { q = '', status = '' } = req.query;

    Order.getAllOrdersWithUsers((err, orders) => {
      if (err) {
        console.error('Error loading purchases:', err);
        return res.status(500).send('Error loading purchases');
      }

      let filtered = orders || [];
      const term = q.trim().toLowerCase();
      if (term) {
        filtered = filtered.filter(o =>
          (o.username && o.username.toLowerCase().includes(term)) ||
          (o.email && o.email.toLowerCase().includes(term))
        );
      }
      if (status) {
        filtered = filtered.filter(o => (o.status || 'Processing') === status);
      }

      res.render('adminPurchases', { purchases: filtered, q, status });
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
      const totalItems = items.reduce((sum, item) => sum + Number(item.quantity), 0);

      // Reuse same view as user
      res.render('receiptDetails', {
        items,
        totalAmount,
        totalItems,
        tax: items[0].tax || 0,
        receiptDate: items[0].createdAt,
        orderNumber: orderId,
        invoiceNumber: items[0].invoiceNumber || `INV-${orderId}`,
        paymentMethod: 'N/A',
        userInfo: { name: items[0].username, email: items[0].email },
        status: items[0].status || 'Processing',
        isAdmin: true,
        statuses: STATUS_VALUES
      });
    });
  }
};

module.exports = adminController;
