// models/productModel.js
// Data access layer for the products table.
const db = require('../db');

const Product = {
  // List all products (including zero quantity).
  getAllProducts: (callback) => {
    const sql = `
      SELECT 
        id,
        productName,
        productName AS name,
        quantity,
        price,
        image
      FROM products
    `;
    db.query(sql, callback);
  },
  
  // Search all products by name (LIKE match).
  searchProductsByName: (searchTerm, callback) => {
    const like = `%${searchTerm}%`;
    const sql = `
      SELECT 
        id,
        productName,
        productName AS name,
        quantity,
        price,
        image
      FROM products
      WHERE productName LIKE ?
    `;
    db.query(sql, [like], callback);
  },

  // Fetch a single product by id.
  getProductById: (id, callback) => {
    const sql = `
      SELECT 
        id,
        productName,
        productName AS name,
        quantity,
        price,
        image
      FROM products
      WHERE id = ?
    `;
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  // List only in-stock products.
  getActiveProducts: (callback) => {
    const sql = `
      SELECT 
        id,
        productName,
        productName AS name,
        quantity,
        price,
        image
      FROM products
      WHERE quantity > 0
    `;
    db.query(sql, callback);
  },
  
  // Search only in-stock products by name.
  searchActiveProductsByName: (searchTerm, callback) => {
    const like = `%${searchTerm}%`;
    const sql = `
      SELECT 
        id,
        productName,
        productName AS name,
        quantity,
        price,
        image
      FROM products
      WHERE productName LIKE ? AND quantity > 0
    `;
    db.query(sql, [like], callback);
  },

  // Insert a new product record.
  createProduct: (productData, callback) => {
    const { productName, quantity, price, image } = productData;
    const sql = `
      INSERT INTO products (productName, quantity, price, image)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [productName, quantity, price, image], callback);
  },

  // Update a product record by id.
  updateProduct: (id, productData, callback) => {
    const { productName, quantity, price, image } = productData;
    const sql = `
      UPDATE products
      SET productName = ?, quantity = ?, price = ?, image = ?
      WHERE id = ?
    `;
    db.query(sql, [productName, quantity, price, image, id], callback);
  },

  // Needed for wishlist
  // Bulk fetch products by ids (used by wishlist).
  getProductsByIds: (ids, callback) => {
    if (!ids || ids.length === 0) return callback(null, []);

    const placeholders = ids.map(() => '?').join(',');

    const sql = `
      SELECT
        id,
        productName AS name,
        quantity,
        price,
        image
      FROM products
      WHERE id IN (${placeholders})
    `;

    db.query(sql, ids, callback);
  },

  // delete the product + related purchases
  // Remove purchase rows first (FK), then delete the product row.
  deleteProduct: (id, callback) => {
    // Remove dependent purchase rows first to satisfy FK constraint, then delete the product row.
    const deletePurchasesSql = 'DELETE FROM purchases WHERE productId = ?';
    const deleteProductSql = 'DELETE FROM products WHERE id = ?';

    db.query(deletePurchasesSql, [id], (err) => {
      if (err) return callback(err);
      db.query(deleteProductSql, [id], callback);
    });
  },

  // Update stock quantity for a product.
  updateQuantity: (id, quantity, callback) => {
    const sql = 'UPDATE products SET quantity = ? WHERE id = ?';
    db.query(sql, [quantity, id], callback);
  }
};

module.exports = Product;
