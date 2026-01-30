// models/storeCreditModel.js
const db = require('../db');

const StoreCredit = {
  addTransaction: (userId, amount, type, reference, callback) => {
    const sql = `
      INSERT INTO store_credit_transactions (userId, amount, type, reference)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [userId, amount, type, reference || null], (err) => {
      if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR')) {
        return callback(null);
      }
      callback(err);
    });
  },

  getHistoryByUser: (userId, limit = 10, callback) => {
    const sql = `
      SELECT id, userId, amount, type, reference, createdAt
      FROM store_credit_transactions
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ?
    `;
    db.query(sql, [userId, Number(limit) || 10], (err, results) => {
      if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR')) {
        return callback(null, []);
      }
      callback(err, results || []);
    });
  }
};

module.exports = StoreCredit;
