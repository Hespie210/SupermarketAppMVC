// models/orderModel.js
const db = require('../db');

// Supported statuses
const STATUS_VALUES = [
  'Processing',
  'Packing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
  'Failed Payment',
  'Refunded'
];

const Order = {
  // Create order + items in a transaction
  createOrder: (userId, cart, callback) => {
    if (!cart || !cart.length) return callback(new Error('Cart is empty'));

    db.beginTransaction(err => {
      if (err) return callback(err);

      const orderSql = 'INSERT INTO orders (userId, status) VALUES (?, ?)';
      db.query(orderSql, [userId, 'Processing'], (errOrder, orderResult) => {
        if (errOrder) return db.rollback(() => callback(errOrder));

        const orderId = orderResult.insertId;
        const values = cart.map(item => [
          orderId,
          item.productId,
          item.quantity,
          item.price
        ]);

        const itemsSql = `
          INSERT INTO order_items (orderId, productId, quantity, price)
          VALUES ?
        `;

        db.query(itemsSql, [values], (errItems) => {
          if (errItems) return db.rollback(() => callback(errItems));
          db.commit(errCommit => callback(errCommit, { orderId }));
        });
      });
    });
  },

  // User: list of orders with totals
  getOrdersByUser: (userId, callback) => {
    const sql = `
      SELECT
        o.id,
        o.userId,
        o.createdAt,
        o.status,
        SUM(oi.quantity) AS totalQuantity,
        SUM(oi.quantity * oi.price) AS totalAmount
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      WHERE o.userId = ?
      GROUP BY o.id, o.userId, o.createdAt, o.status
      ORDER BY o.createdAt DESC
    `;
    db.query(sql, [userId], callback);
  },

  // User: order details
  getOrderDetailsByUser: (userId, orderId, callback) => {
    const sql = `
      SELECT
        o.id AS orderId,
        o.userId,
        o.createdAt,
        o.status,
        oi.productId,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS subtotal,
        p.productName,
        p.image
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN products p ON p.id = oi.productId
      WHERE o.userId = ? AND o.id = ?
      ORDER BY oi.id
    `;
    db.query(sql, [userId, orderId], callback);
  },

  // Admin: aggregated orders with user info
  getAllOrdersWithUsers: (callback) => {
    const sql = `
      SELECT
        o.id,
        o.userId,
        o.createdAt,
        o.status,
        SUM(oi.quantity) AS totalQuantity,
        SUM(oi.quantity * oi.price) AS totalAmount,
        u.username,
        u.email
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN users u ON u.id = o.userId
      GROUP BY o.id, o.userId, o.createdAt, o.status, u.username, u.email
      ORDER BY o.createdAt DESC
    `;
    db.query(sql, callback);
  },

  // Admin: order detail with user info
  getOrderDetailsForAdmin: (orderId, callback) => {
    const sql = `
      SELECT
        o.id AS orderId,
        o.userId,
        o.createdAt,
        o.status,
        oi.productId,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS subtotal,
        p.productName,
        p.image,
        u.username,
        u.email
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN products p ON p.id = oi.productId
      JOIN users u ON u.id = o.userId
      WHERE o.id = ?
      ORDER BY oi.id
    `;
    db.query(sql, [orderId], callback);
  },

  updateStatus: (orderId, status, callback) => {
    if (!STATUS_VALUES.includes(status)) {
      return callback(new Error('Invalid status'));
    }
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    db.query(sql, [status, orderId], callback);
  },

  STATUS_VALUES
};

module.exports = Order;
