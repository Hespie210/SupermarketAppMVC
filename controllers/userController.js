// controllers/userController.js
const User = require('../models/userModel');

const userController = {
  showProfile: (req, res) => {
    // You can also re-fetch from DB, but session is usually enough
    res.render('profile', { currentUser: req.session.user });
  },

  uploadProfilePhoto: (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const filename = req.file.filename;
    const userId = req.session.user.id;

    User.updateProfileImage(userId, filename, (err) => {
      if (err) return res.status(500).send('Error saving profile image');

      // Update session so navbar changes immediately
      req.session.user.profileImage = filename;

      res.redirect('/profile');
    });
  }
};

module.exports = userController;