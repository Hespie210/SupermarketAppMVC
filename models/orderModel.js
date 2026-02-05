// models/orderModel.js
// Data access layer for orders and order_items (including store credit flow).
const db = require('../db');

// Supported statuses for validation and UI labels.
const STATUS_VALUES = [
  'Processing',
  'Packing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
  'Failed Payment',
  'Refund Requested',
  'Refund Rejected',
  'Refunded'
];

// Statuses that should be auto-cancelled when a user is removed.
const CANCEL_ON_DELETE_STATUSES = [
  'Processing',
  'Packing',
  'Out for Delivery',
  'Failed Payment'
];

// Simple keyword-based category tagging for order detail display.
const CATEGORY_MAP = [
  { name: 'Fruits', match: ['apple', 'apples', 'banana', 'bananas'] },
  { name: 'Vegetables', match: ['broccoli', 'tomato', 'tomatoes'] },
  { name: 'Beverages', match: ['milk'] },
  { name: 'Bakery', match: ['bread'] }
];

// Helper: try primary query, and on missing column errors fall back for older schema.
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

// Determine category from a product name; falls back to "Other".
function detectCategory(productName = '') {
  const lower = (productName || '').toLowerCase();
  for (const group of CATEGORY_MAP) {
    if (group.match.some(m => lower.includes(m))) return group.name;
  }
  return 'Other';
}

const Order = {
  // Create order + items in a transaction, with schema fallback if columns are missing.
  createOrder: (userId, cart, totals, invoiceNumber, callback) => {
    if (!cart || !cart.length) return callback(new Error('Cart is empty'));

    const total = Number(totals?.total || 0);
    const tax = Number(totals?.tax || 0);

    const decrementInventory = (items, done) => {
      const sql = `
        UPDATE products
        SET quantity = quantity - ?
        WHERE id = ? AND quantity >= ?
      `;

      const step = (idx) => {
        if (idx >= items.length) return done();
        const item = items[idx];
        db.query(sql, [item.quantity, item.productId, item.quantity], (err, result) => {
          if (err) return done(err);
          if (result.affectedRows === 0) {
            return done(new Error(`Insufficient stock for product ${item.productId}`));
          }
          step(idx + 1);
        });
      };

      step(0);
    };

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
            decrementInventory(cart, (errStock) => {
              if (errStock) return db.rollback(() => callback(errStock));
              db.commit(errCommit => callback(errCommit, { orderId: ordId }));
            });
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
          decrementInventory(cart, (errStock) => {
            if (errStock) return db.rollback(() => callback(errStock));
            db.commit(errCommit => callback(errCommit, { orderId }));
          });
        });
      });
    });
  },

  // Create order paid with store credit (atomic: balance + order + items + inventory).
  createOrderWithStoreCredit: (userId, cart, totals, invoiceNumber, callback) => {
    if (!cart || !cart.length) return callback(new Error('Cart is empty'));

    const total = Number(totals?.total || 0);
    const tax = Number(totals?.tax || 0);

    const decrementInventory = (items, done) => {
      const sql = `
        UPDATE products
        SET quantity = quantity - ?
        WHERE id = ? AND quantity >= ?
      `;

      const step = (idx) => {
        if (idx >= items.length) return done();
        const item = items[idx];
        db.query(sql, [item.quantity, item.productId, item.quantity], (err, result) => {
          if (err) return done(err);
          if (result.affectedRows === 0) {
            return done(new Error(`Insufficient stock for product ${item.productId}`));
          }
          step(idx + 1);
        });
      };

      step(0);
    };

    db.beginTransaction(err => {
      if (err) return callback(err);

      const creditSql = 'SELECT storeCredit FROM users WHERE id = ? FOR UPDATE';
      db.query(creditSql, [userId], (creditErr, creditRows) => {
        if (creditErr && creditErr.code === 'ER_BAD_FIELD_ERROR') {
          return db.rollback(() => callback(new Error('Store credit is not configured.')));
        }
        if (creditErr) return db.rollback(() => callback(creditErr));

        const currentCredit = creditRows && creditRows[0] && creditRows[0].storeCredit != null
          ? Number(creditRows[0].storeCredit)
          : 0;

        if (currentCredit < total) {
          return db.rollback(() => callback(new Error('Insufficient store credit balance.')));
        }

        const debitSql = 'UPDATE users SET storeCredit = storeCredit - ? WHERE id = ?';
        db.query(debitSql, [total, userId], (debitErr) => {
          if (debitErr && debitErr.code === 'ER_BAD_FIELD_ERROR') {
            return db.rollback(() => callback(new Error('Store credit is not configured.')));
          }
          if (debitErr) return db.rollback(() => callback(debitErr));

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
                decrementInventory(cart, (errStock) => {
                  if (errStock) return db.rollback(() => callback(errStock));
                  db.commit(errCommit => callback(errCommit, { orderId: ordId }));
                });
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
              decrementInventory(cart, (errStock) => {
                if (errStock) return db.rollback(() => callback(errStock));
                db.commit(errCommit => callback(errCommit, { orderId }));
              });
            });
          });
        });
      });
    });
  },

  // User: list of orders with totals (grouped by order).
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
        o.paymentMethod,
        SUM(oi.quantity) AS totalQuantity,
        SUM(oi.quantity * oi.price) AS totalAmount
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      WHERE o.userId = ?
      GROUP BY o.id, o.userId, o.createdAt, o.status
      ORDER BY o.createdAt DESC
    `;
    const fallbackSql = `
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
    queryWithFallback(sql, [userId], fallbackSql, [userId], callback);
  },

  // User: order details (items + product info + computed categories).
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
        o.paymentMethod,
        o.paymentRef,
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
      LEFT JOIN products p ON p.id = oi.productId
      JOIN users u ON u.id = o.userId
      WHERE o.userId = ? AND o.id = ?
      ORDER BY oi.id
    `;
    const fallbackSql = `
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
      LEFT JOIN products p ON p.id = oi.productId
      JOIN users u ON u.id = o.userId
      WHERE o.userId = ? AND o.id = ?
      ORDER BY oi.id
    `;
    queryWithFallback(sql, [userId, orderId], fallbackSql, [userId, orderId], (err, results) => {
      if (err) return callback(err);
      const mapped = (results || []).map(r => {
        const productName = r.productName || 'Deleted product';
        return {
          ...r,
          productName,
          image: r.image || null,
          category: detectCategory(productName)
        };
      });
      callback(null, mapped);
    });
  },

  // Admin: aggregated orders with user info.
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
        o.paymentMethod,
        SUM(oi.quantity) AS totalQuantity,
        SUM(oi.quantity * oi.price) AS totalAmount,
        u.username,
        u.email,
        u.role AS userRole
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN users u ON u.id = o.userId
      GROUP BY o.id, o.userId, o.createdAt, o.status, u.username, u.email, u.role
      ORDER BY o.createdAt DESC
    `;
    const fallbackSql = `
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
        u.email,
        u.role AS userRole
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      JOIN users u ON u.id = o.userId
      GROUP BY o.id, o.userId, o.createdAt, o.status, u.username, u.email, u.role
      ORDER BY o.createdAt DESC
    `;
    queryWithFallback(sql, [], fallbackSql, [], callback);
  },

  // Admin: order detail with user info (items + product info).
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
        o.paymentMethod,
        o.paymentRef,
        oi.productId,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS subtotal,
        p.productName,
        p.image,
        u.username,
        u.email,
        u.role AS userRole
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      LEFT JOIN products p ON p.id = oi.productId
      JOIN users u ON u.id = o.userId
      WHERE o.id = ?
      ORDER BY oi.id
    `;
    const fallbackSql = `
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
        u.email,
        u.role AS userRole
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      LEFT JOIN products p ON p.id = oi.productId
      JOIN users u ON u.id = o.userId
      WHERE o.id = ?
      ORDER BY oi.id
    `;
    queryWithFallback(sql, [orderId], fallbackSql, [orderId], (err, results) => {
      if (err) return callback(err);
      const mapped = (results || []).map(r => {
        const productName = r.productName || 'Deleted product';
        return {
          ...r,
          productName,
          image: r.image || null,
          category: detectCategory(productName)
        };
      });
      callback(null, mapped);
    });
  },

  // Update order status with validation.
  updateStatus: (orderId, status, callback) => {
    if (!STATUS_VALUES.includes(status)) {
      return callback(new Error('Invalid status'));
    }
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    db.query(sql, [status, orderId], callback);
  },

  // Fetch an order with user role (used for auth checks).
  getOrderWithUser: (orderId, callback) => {
    const sql = `
      SELECT o.id, o.status, o.userId, u.role AS userRole, o.paymentMethod, o.paymentRef, o.total
      FROM orders o
      JOIN users u ON u.id = o.userId
      WHERE o.id = ?
    `;
    const fallbackSql = `
      SELECT o.id, o.status, o.userId, u.role AS userRole, o.total
      FROM orders o
      JOIN users u ON u.id = o.userId
      WHERE o.id = ?
    `;
    queryWithFallback(sql, [orderId], fallbackSql, [orderId], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  // Update optional payment metadata (method/ref/refundRef) if columns exist.
  updatePaymentMeta: (orderId, meta, callback) => {
    if (!meta || typeof meta !== 'object') return callback(null);

    const fields = [];
    const params = [];
    if (Object.prototype.hasOwnProperty.call(meta, 'paymentMethod')) {
      fields.push('paymentMethod = ?');
      params.push(meta.paymentMethod);
    }
    if (Object.prototype.hasOwnProperty.call(meta, 'paymentRef')) {
      fields.push('paymentRef = ?');
      params.push(meta.paymentRef);
    }
    if (Object.prototype.hasOwnProperty.call(meta, 'refundRef')) {
      fields.push('refundRef = ?');
      params.push(meta.refundRef);
    }

    if (!fields.length) return callback(null);

    const sql = `
      UPDATE orders
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    params.push(orderId);
    db.query(sql, params, (err) => {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        return callback(null);
      }
      callback(err);
    });
  },

  // Cancel in-flight orders when a user is deleted.
  cancelOrdersForUser: (userId, callback) => {
    const sql = `
      UPDATE orders
      SET status = 'Cancelled'
      WHERE userId = ? AND status IN (?)
    `;
    db.query(sql, [userId, CANCEL_ON_DELETE_STATUSES], callback);
  },

  STATUS_VALUES,
  CANCEL_ON_DELETE_STATUSES
};

module.exports = Order;
