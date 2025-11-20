// models/productModel.js
const db = require('../db');

const Product = {
  getAllProducts: (callback) => {
    db.query('SELECT * FROM products', callback);
  },

  getProductById: (id, callback) => {
    db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  createProduct: (productData, callback) => {
    const { productName, quantity, price, image } = productData;
    const sql =
      'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [productName, quantity, price, image], callback);
  },

  updateProduct: (id, productData, callback) => {
    const { productName, quantity, price, image } = productData;
    const sql =
      'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?';
    db.query(sql, [productName, quantity, price, image, id], callback);
  },

  // delete the product + its related purchases
  deleteProduct: (id, callback) => {
    // 1) delete related purchases first
    const sqlDeletePurchases = 'DELETE FROM purchases WHERE productId = ?';
    db.query(sqlDeletePurchases, [id], (err) => {
      if (err) return callback(err);

      // 2) now delete the product
      const sqlDeleteProduct = 'DELETE FROM products WHERE id = ?';
      db.query(sqlDeleteProduct, [id], callback);
    });
  }
};

module.exports = Product;