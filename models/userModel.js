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
      WHERE role != 'deleted'
    `;
    db.query(sql, callback);
  },

  // Soft delete user by ID (preserve record for audit/history; block admins)
  deleteUserById: (id, callback) => {
    const sql = `
      UPDATE users
      SET role = 'deleted'
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

  getStoreCredit: (id, callback) => {
    const sql = 'SELECT storeCredit FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        return callback(null, 0);
      }
      if (err) return callback(err);
      const credit = results && results[0] && results[0].storeCredit != null
        ? Number(results[0].storeCredit)
        : 0;
      callback(null, credit);
    });
  },

  addStoreCredit: (id, amount, callback) => {
    const value = Number(amount) || 0;
    const sql = `
      UPDATE users
      SET storeCredit = COALESCE(storeCredit, 0) + ?
      WHERE id = ?
    `;
    db.query(sql, [value, id], (err) => {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        return callback(new Error('Store credit is not configured.'));
      }
      callback(err);
    });
  },

  getUserCount: (callback) => {
    const sql = `
      SELECT COUNT(*) AS totalUsers
      FROM users
      WHERE role != 'deleted'
    `;
    db.query(sql, (err, results) => {
      if (err) return callback(err);
      callback(null, results[0]?.totalUsers || 0);
    });
  }
};

module.exports = User;
