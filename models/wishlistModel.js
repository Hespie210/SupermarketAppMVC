// models/wishlistModel.js
const db = require('../db');

const Wishlist = {
  addItem: (userId, productId, callback) => {
    const sql = `
      INSERT INTO wishlist (user_id, product_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `;
    db.query(sql, [userId, productId], callback);
  },

  removeItem: (userId, productId, callback) => {
    const sql = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';
    db.query(sql, [userId, productId], callback);
  },

  getItemsByUser: (userId, callback) => {
    const sql = 'SELECT product_id FROM wishlist WHERE user_id = ?';
    db.query(sql, [userId], callback);
  }
};

module.exports = Wishlist;