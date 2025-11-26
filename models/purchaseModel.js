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

  // One row per checkout for the logged-in user
  getReceiptSummariesByUserId: (userId, callback) => {
    const sql = `
      SELECT
        p.userId,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        SUM(p.quantity)            AS totalQuantity,
        SUM(p.price * p.quantity)  AS totalAmount
      FROM purchases p
      WHERE p.userId = ?
      GROUP BY p.userId, p.createdAt
      ORDER BY p.createdAt DESC
    `;

    db.query(sql, [userId], callback);
  },

  // Detailed lines for ONE receipt (one checkout)
  getReceiptDetails: (userId, receiptTimestamp, callback) => {
    const sql = `
      SELECT
        p.id,
        p.userId,
        p.productId,
        p.quantity,
        p.price,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        pr.productName,
        (p.quantity * p.price)      AS subtotal
      FROM purchases p
      JOIN products pr ON p.productId = pr.id
      WHERE p.userId = ?
        AND UNIX_TIMESTAMP(p.createdAt) = ?
      ORDER BY p.id
    `;

    db.query(sql, [userId, receiptTimestamp], callback);
  },

  // Admin: list all purchase lines with user + product info
  getAllPurchasesWithUsers: (callback) => {
    const sql = `
      SELECT
        p.*,
        (p.quantity * p.price)      AS subtotal,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        u.username,
        u.email,
        pr.productName
      FROM purchases p
      JOIN users u     ON p.userId    = u.id
      JOIN products pr ON p.productId = pr.id
      ORDER BY p.createdAt DESC, p.id DESC
    `;

    db.query(sql, callback);
  }
};

module.exports = Purchase;
