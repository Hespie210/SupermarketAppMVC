// controllers/userController.js
const User = require('../models/userModel');

const userController = {
  showProfile: (req, res) => {
    const userId = req.session.user.id;

    // Always get the latest data from DB
    User.getUserById(userId, (err, user) => {
      if (err) {
        console.error('Error loading profile:', err);
        return res.status(500).send('Error loading profile');
      }
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Refresh session so navbar etc. are in sync
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      };

      res.render('profile', { currentUser: req.session.user });
    });
  },

  uploadProfilePhoto: (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const filename = req.file.filename;
    const userId = req.session.user.id;

    User.updateProfileImage(userId, filename, (err) => {
      if (err) {
        console.error('Error saving profile image:', err);
        return res.status(500).send('Error saving profile image');
      }

      // Update session so navbar/profile update immediately
      req.session.user.profileImage = filename;

      res.redirect('/profile');
    });
  }
};

module.exports = userController;
