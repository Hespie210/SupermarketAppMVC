// models/wishlistModel.js
const db = require('../db');

const Wishlist = {
  addItem: (userId, productId, quantity, callback) => {
    const qty = Number.isNaN(quantity) ? 1 : quantity;
    const sql = `
      INSERT INTO wishlist (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), created_at = CURRENT_TIMESTAMP
    `;
    db.query(sql, [userId, productId, qty], callback);
  },

  removeItem: (userId, productId, callback) => {
    const sql = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';
    db.query(sql, [userId, productId], callback);
  },

  getItemsByUser: (userId, callback) => {
    const sql = 'SELECT product_id, quantity FROM wishlist WHERE user_id = ?';
    db.query(sql, [userId], callback);
  }
};

module.exports = Wishlist;
