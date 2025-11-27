// controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const authController = {
  // Show register form
  showRegister: (req, res) => {
    res.render('register');
  },

  // Handle register
  register: (req, res) => {
    const { username, email, password, address, contact } = req.body;
    const finalRole = 'user'; // enforce basic user role on self-registration

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('BCRYPT ERROR (register):', err);
        return res.status(500).send('Error hashing password');
      }

      // username, email, hashedPassword, address, contact, role
      User.createUser(username, email, hashedPassword, address, contact, finalRole, (err2) => {
        if (err2) {
          console.error('MYSQL ERROR (register):', err2);
          return res.status(500).send('Error registering user');
        }

        req.flash('success', 'Registration successful. Please log in.');
        res.redirect('/login');
      });
    });
  },

  // Show login form
  showLogin: (req, res) => {
    res.render('login');
  },

  // Login with email + password
  login: (req, res) => {
    const { email, password } = req.body;

    User.getUserByEmail(email, (err, user) => {
      if (err) {
        console.error('MYSQL ERROR (login):', err);
        return res.status(500).send('Error logging in');
      }

      if (!user) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/login');
      }

      if (user.role === 'deleted') {
        req.flash('error', 'This account has been deactivated. Please contact support.');
        return res.redirect('/login');
      }

      bcrypt.compare(password, user.password, (err2, isMatch) => {
        if (err2) {
          console.error('BCRYPT ERROR (login):', err2);
          return res.status(500).send('Error logging in');
        }

        if (!isMatch) {
          req.flash('error', 'Invalid username or password');
          return res.redirect('/login');
        }

        // Store minimal info in session
        req.session.user = {
          id: user.id,
          username: user.username,
          role: user.role
        };

        // Admins go straight to dashboard (inventory); others to shopping
        if (user.role === 'admin') {
          return res.redirect('/inventory');
        }
        res.redirect('/shopping');
      });
    });
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  }
};

module.exports = authController;
