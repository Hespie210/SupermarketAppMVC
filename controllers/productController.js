// controllers/productController.js
const Product = require('../models/productModel');

const productController = {
showShopping: (req, res) => {
  const search = (req.query.search || '').trim();

  const done = (err, products) => {
    if (err) return res.status(500).send('Error loading products');
    res.render('shopping', { products, search });  // pass search to EJS
  };

  if (search) {
    Product.searchProductsByName(search, done);
  } else {
    Product.getAllProducts(done);
  }
},


  showInventory: (req, res) => {
    Product.getAllProducts((err, results) => {
      if (err) return res.status(500).send('Error loading inventory');
      res.render('inventory', { products: results });
    });
  },

  showProductDetails: (req, res) => {
    const id = req.params.id;
    Product.getProductById(id, (err, product) => {
      if (err) return res.status(500).send('Error loading product');
      if (!product) return res.status(404).send('Product not found');
      res.render('product', { product });
    });
  },

  showAddProduct: (req, res) => {
    res.render('addProduct');
  },

  // ---------- ADD PRODUCT ----------
  addProduct: (req, res) => {
    const { name, quantity, price } = req.body;
    const image = req.file ? req.file.filename : null;

    const productData = {
      productName: name,
      quantity: parseInt(quantity, 10),
      price: parseFloat(price),
      image
    };

    Product.createProduct(productData, (err) => {
      if (err) {
        console.error('MYSQL ERROR (addProduct):', err);
        return res.status(500).send('Error adding product');
      }
      res.redirect('/inventory');
    });
  },

  showUpdateProduct: (req, res) => {
    const id = req.params.id;
    Product.getProductById(id, (err, product) => {
      if (err) return res.status(500).send('Error loading product');
      if (!product) return res.status(404).send('Product not found');
      res.render('updateProduct', { product });
    });
  },

  // ---------- UPDATE PRODUCT ----------
  updateProduct: (req, res) => {
    const id = req.params.id;
    const { name, quantity, price, currentImage } = req.body;

    let image = currentImage;
    if (req.file && req.file.filename) {
      image = req.file.filename;
    }

    const productData = {
      productName: name,
      quantity: parseInt(quantity, 10),
      price: parseFloat(price),
      image
    };

    Product.updateProduct(id, productData, (err) => {
      if (err) {
        console.error('MYSQL ERROR (updateProduct):', err);
        return res.status(500).send('Error updating product');
      }
      res.redirect('/inventory');
    });
  },

  // ---------- DELETE PRODUCT ----------
  deleteProduct: (req, res) => {
    const id = req.params.id;

    Product.deleteProduct(id, (err) => {
      if (err) {
        console.error('MYSQL ERROR (deleteProduct):', err);
        return res.status(500).send('Error deleting product');
      }
      res.redirect('/inventory');
    });
  }
};

module.exports = productController;