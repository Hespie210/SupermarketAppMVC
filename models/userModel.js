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

  // Get user by ID
  getUserById: (id, callback) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  /*
   * ============================================
   * 🔥 ADDITIONAL METHODS FOR ADMIN + PROFILE PIC
   * ============================================
   */

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
    const sql = `
      DELETE FROM users 
      WHERE id = ? AND role != 'admin'
    `;
    db.query(sql, [id], callback);
  },

  // Update profile picture filename
  updateProfileImage: (id, filename, callback) => {
    const sql = `
      UPDATE users 
      SET profileImage = ? 
      WHERE id = ?
    `;
    db.query(sql, [filename, id], callback);
  }
};

module.exports = User;
