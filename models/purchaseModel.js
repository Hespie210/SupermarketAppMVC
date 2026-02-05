// models/purchaseModel.js
// Legacy purchase record queries (used for receipt summaries).
const db = require('../db');

/*
SQL expectations for statuses:
  ALTER TABLE purchases
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Processing';
Supported statuses:
  Processing, Packing, Ready for Pickup, Out for Delivery, Completed, Cancelled, Failed Payment, Refunded
*/

// Helper: try primary query, and on missing column errors fall back.
function queryWithFallback(primarySql, primaryParams, fallbackSql, fallbackParams, callback, postProcess) {
  db.query(primarySql, primaryParams, (err, results) => {
    if (err && err.code === 'ER_BAD_FIELD_ERROR' && fallbackSql) {
      return db.query(fallbackSql, fallbackParams, (err2, results2) => {
        if (postProcess && !err2) return postProcess(null, results2, callback);
        return callback(err2, results2);
      });
    }
    if (postProcess && !err) return postProcess(null, results, callback);
    return callback(err, results);
  });
}

const Purchase = {
  // Save all items from cart into purchases table
  createPurchases: (userId, cart, callback) => {
    if (!cart || cart.length === 0) return callback(null);

    const values = cart.map(item => [
      userId,
      item.productId,
      item.quantity,
      item.price,
      'Processing'
    ]);

    const sql = `
      INSERT INTO purchases (userId, productId, quantity, price, status)
      VALUES ?
    `;
    const fallbackSql = `
      INSERT INTO purchases (userId, productId, quantity, price)
      VALUES ?
    `;

    queryWithFallback(sql, [values], fallbackSql, [values.map(v => v.slice(0, 4))], callback);
  },

  // One row per checkout for the logged-in user
  getReceiptSummariesByUserId: (userId, callback) => {
    const sql = `
      SELECT
        p.userId,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        SUM(p.quantity)            AS totalQuantity,
        SUM(p.price * p.quantity)  AS totalAmount,
        ANY_VALUE(p.status)        AS status
      FROM purchases p
      WHERE p.userId = ?
      GROUP BY p.userId, p.createdAt
      ORDER BY p.createdAt DESC
    `;

    const fallbackSql = `
      SELECT
        p.userId,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        SUM(p.quantity)            AS totalQuantity,
        SUM(p.price * p.quantity)  AS totalAmount,
        'Processing'               AS status
      FROM purchases p
      WHERE p.userId = ?
      GROUP BY p.userId, p.createdAt
      ORDER BY p.createdAt DESC
    `;

    queryWithFallback(sql, [userId], fallbackSql, [userId], callback);
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
        p.status,
        (p.quantity * p.price)      AS subtotal
      FROM purchases p
      JOIN products pr ON p.productId = pr.id
      WHERE p.userId = ?
        AND UNIX_TIMESTAMP(p.createdAt) = ?
      ORDER BY p.id
    `;

    const fallbackSql = `
      SELECT
        p.id,
        p.userId,
        p.productId,
        p.quantity,
        p.price,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        pr.productName,
        'Processing' AS status,
        (p.quantity * p.price)      AS subtotal
      FROM purchases p
      JOIN products pr ON p.productId = pr.id
      WHERE p.userId = ?
        AND UNIX_TIMESTAMP(p.createdAt) = ?
      ORDER BY p.id
    `;

    queryWithFallback(sql, [userId, receiptTimestamp], fallbackSql, [userId, receiptTimestamp], callback);
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
        pr.productName,
        p.status
      FROM purchases p
      JOIN users u     ON p.userId    = u.id
      JOIN products pr ON p.productId = pr.id
      ORDER BY p.createdAt DESC, p.id DESC
    `;

    const fallbackSql = `
      SELECT
        p.*,
        (p.quantity * p.price)      AS subtotal,
        UNIX_TIMESTAMP(p.createdAt) AS receiptTimestamp,
        u.username,
        u.email,
        pr.productName,
        'Processing' AS status
      FROM purchases p
      JOIN users u     ON p.userId    = u.id
      JOIN products pr ON p.productId = pr.id
      ORDER BY p.createdAt DESC, p.id DESC
    `;

    queryWithFallback(sql, [], fallbackSql, [], callback);
  },

  // Admin: aggregated orders (one per checkout)
  getAllOrderSummaries: (callback) => {
    const sql = `
      SELECT
        p.userId,
        ANY_VALUE(u.username)          AS username,
        ANY_VALUE(u.email)             AS email,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt)    AS receiptTimestamp,
        SUM(p.quantity)                AS totalQuantity,
        SUM(p.price * p.quantity)      AS totalAmount,
        ANY_VALUE(p.status)            AS status
      FROM purchases p
      JOIN users u ON p.userId = u.id
      GROUP BY p.userId, p.createdAt
      ORDER BY p.createdAt DESC
    `;
    const fallbackSql = `
      SELECT
        p.userId,
        ANY_VALUE(u.username)          AS username,
        ANY_VALUE(u.email)             AS email,
        p.createdAt,
        UNIX_TIMESTAMP(p.createdAt)    AS receiptTimestamp,
        SUM(p.quantity)                AS totalQuantity,
        SUM(p.price * p.quantity)      AS totalAmount,
        'Processing'                   AS status
      FROM purchases p
      JOIN users u ON p.userId = u.id
      GROUP BY p.userId, p.createdAt
      ORDER BY p.createdAt DESC
    `;

    queryWithFallback(sql, [], fallbackSql, [], callback);
  },

  // Update status for all rows in a checkout (identified by userId + receiptTimestamp)
  updateOrderStatus: (userId, receiptTimestamp, status, callback) => {
    // Use a 1-second window to guard against sub-second timestamp differences
    const sql = `
      UPDATE purchases
      SET status = ?
      WHERE userId = ?
        AND createdAt BETWEEN FROM_UNIXTIME(?) AND DATE_ADD(FROM_UNIXTIME(?), INTERVAL 1 SECOND)
    `;
    queryWithFallback(sql, [status, userId, receiptTimestamp, receiptTimestamp], null, null, callback);
  }
};

module.exports = Purchase;
