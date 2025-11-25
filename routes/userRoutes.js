// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const userController = require('../controllers/userController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Multer storage for profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/profile');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/profile', checkAuthenticated, userController.showProfile);
router.post('/profile/upload-photo', checkAuthenticated, upload.single('profileImage'), userController.uploadProfilePhoto);

module.exports = router;