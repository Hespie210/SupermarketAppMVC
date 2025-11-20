// models/purchaseModel.js
const db = require('../db');

const Purchase = {
  // Save all items from cart into purchases table
  createPurchases: (userId, cart, callback) => {
    if (!cart || cart.length === 0) return callback(null);

    const values = cart.map(item => [
      userId,
      item.productId,
      item.quantity,
      item.price
    ]);

    const sql = `
      INSERT INTO purchases (userId, productId, quantity, price)
      VALUES ?
    `;

    db.query(sql, [values], callback);
  },

  // Get all purchases for one user
  getPurchasesByUserId: (userId, callback) => {
    const sql = `
      SELECT
        p.id,
        p.quantity,
        p.price,
        p.createdAt,
        pr.productName
      FROM purchases p
      JOIN products pr ON p.productId = pr.id
      WHERE p.userId = ?
      ORDER BY p.createdAt DESC
    `;
    db.query(sql, [userId], callback);
  }
};

module.exports = Purchase;
 