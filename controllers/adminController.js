// controllers/adminController.js
const User = require('../models/userModel');

const adminController = {
  showUsers: (req, res) => {
    User.getAllUsers((err, results) => {
      if (err) return res.status(500).send('Error loading users');
      res.render('adminUsers', { users: results });
    });
  },

  deleteUser: (req, res) => {
    const id = parseInt(req.params.id, 10);

    // Extra safety: do not let admin delete themselves
    if (id === req.session.user.id) {
      req.flash('error', 'You cannot delete your own account from here.');
      return res.redirect('/admin/users');
    }

    User.deleteUserById(id, (err, result) => {
      if (err) return res.status(500).send('Error deleting user');

      if (result.affectedRows === 0) {
        req.flash('error', 'Cannot delete admin users.');
        return res.redirect('/admin/users');
      }

      req.flash('success', 'User deleted successfully.');
      res.redirect('/admin/users');
    });
  }
};

module.exports = adminController;
