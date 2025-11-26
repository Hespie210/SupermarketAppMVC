// models/userModel.js
const db = require('../db');

const User = {
  // Insert full user record
  // username, email, hashedPassword, address, contact, role
  createUser: (username, email, hashedPassword, address, contact, role, callback) => {
    const sql = `
      INSERT INTO users (username, email, password, address, contact, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [username, email, hashedPassword, address, contact, role], callback);
  },

  // Login by email - always use latest record for that email
  getUserByEmail: (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ? ORDER BY id DESC LIMIT 1';
    db.query(sql, [email], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  // Get user by ID (includes email, role, profileImage, etc.)
  getUserById: (id, callback) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  // Get ALL users (for admin dashboard)
  getAllUsers: (callback) => {
    const sql = `
      SELECT id, username, email, address, contact, role, profileImage
      FROM users
    `;
    db.query(sql, callback);
  },

  // Delete user by ID (but NOT admins)
  deleteUserById: (id, callback) => {
    // Clean up dependent rows to avoid FK constraint issues
    const sqlDeleteWishlist = 'DELETE FROM wishlist WHERE user_id = ?';
    const sqlDeletePurchases = 'DELETE FROM purchases WHERE userId = ?';
    const sqlDeleteUser = `
      DELETE FROM users 
      WHERE id = ? AND role != 'admin'
    `;

    db.beginTransaction(err => {
      if (err) return callback(err);

      db.query(sqlDeleteWishlist, [id], err1 => {
        if (err1) return db.rollback(() => callback(err1));

        db.query(sqlDeletePurchases, [id], err2 => {
          if (err2) return db.rollback(() => callback(err2));

          db.query(sqlDeleteUser, [id], (err3, result) => {
            if (err3) return db.rollback(() => callback(err3));
            db.commit(err4 => callback(err4, result));
          });
        });
      });
    });
  },

  // Update profile picture filename
  updateProfileImage: (id, filename, callback) => {
    const sql = `
      UPDATE users 
      SET profileImage = ? 
      WHERE id = ?
    `;
    db.query(sql, [filename, id], callback);
  },

  updateUser: (id, data, callback) => {
    const { username, email, role } = data;
    const sql = `
      UPDATE users
      SET username = ?, email = ?, role = ?
      WHERE id = ?
    `;
    db.query(sql, [username, email, role, id], callback);
  },

  getUserCount: (callback) => {
    const sql = 'SELECT COUNT(*) AS totalUsers FROM users';
    db.query(sql, (err, results) => {
      if (err) return callback(err);
      callback(null, results[0]?.totalUsers || 0);
    });
  }
};

module.exports = User;
