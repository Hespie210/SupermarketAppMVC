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

  getUserById: (id, callback) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  }
};

module.exports = User;