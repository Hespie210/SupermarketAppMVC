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
  // Create order + items in a transaction with graceful fallback if columns missing
  createOrder: (userId, cart, totals, invoiceNumber, callback) => {
    if (!cart || !cart.length) return callback(new Error('Cart is empty'));

    const total = Number(totals?.total || 0);
    const tax = Number(totals?.tax || 0);

    db.beginTransaction(err => {
      if (err) return callback(err);

      const orderSqlFull = `
        INSERT INTO orders (invoiceNumber, userId, status, total, tax)
        VALUES (?, ?, ?, ?, ?)
      `;
      const orderSqlFallback = `
        INSERT INTO orders (userId, status)
        VALUES (?, ?)
      `;

      const insertOrder = (sql, params, next) => {
        db.query(sql, params, (errOrder, orderResult) => {
          if (errOrder) return next(errOrder);
          next(null, orderResult.insertId);
        });
      };

      const itemsSqlFull = `
        INSERT INTO order_items (orderId, productId, quantity, price, subtotal)
        VALUES ?
      `;
      const itemsSqlFallback = `
        INSERT INTO order_items (orderId, productId, quantity, price)
        VALUES ?
      `;

      const doInsertItems = (orderId, useSubtotal, done) => {
        const values = cart.map(item => {
          const base = [orderId, item.productId, item.quantity, item.price];
          return useSubtotal ? [...base, Number(item.quantity) * Number(item.price)] : base;
        });
        const sql = useSubtotal ? itemsSqlFull : itemsSqlFallback;
        db.query(sql, [values], errItems => {
          if (errItems) return done(errItems);
          done(null, orderId);
        });
      };

      insertOrder(orderSqlFull, [invoiceNumber, userId, 'Processing', total, tax], (errOrderFull, orderId) => {
        const fallbackOrder = () => insertOrder(orderSqlFallback, [userId, 'Processing'], (errOrd, ordId) => {
          if (errOrd) return db.rollback(() => callback(errOrd));
          doInsertItems(ordId, false, (errItems2) => {
            if (errItems2) return db.rollback(() => callback(errItems2));
            db.commit(errCommit => callback(errCommit, { orderId: ordId }));
          });
        });

        if (errOrderFull) {
          if (errOrderFull.code === 'ER_BAD_FIELD_ERROR') {
            return fallbackOrder();
          }
          return db.rollback(() => callback(errOrderFull));
        }

        doInsertItems(orderId, true, (errItems) => {
          if (errItems) {
            if (errItems.code === 'ER_BAD_FIELD_ERROR') {
              return fallbackOrder();
            }
            return db.rollback(() => callback(errItems));
          }
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
        o.invoiceNumber,
        o.total,
        o.tax,
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
        o.invoiceNumber,
        o.total,
        o.tax,
        u.username,
        u.email,
        oi.productId,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS subtotal,
        p.productName,
        p.image
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN products p ON p.id = oi.productId
      JOIN users u ON u.id = o.userId
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
        o.invoiceNumber,
        o.total,
        o.tax,
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
        o.invoiceNumber,
        o.total,
        o.tax,
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
