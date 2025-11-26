// controllers/productController.js
const Product = require('../models/productModel');

const CATEGORY_MAP = [
  { name: 'Fruits', match: ['apple', 'apples', 'banana', 'bananas'] },
  { name: 'Vegetables', match: ['broccoli', 'tomato', 'tomatoes'] },
  { name: 'Beverages', match: ['milk'] },
  { name: 'Bakery', match: ['bread'] }
];

function detectCategory(productName = '') {
  const lower = productName.toLowerCase();
  for (const group of CATEGORY_MAP) {
    if (group.match.some(m => lower.includes(m))) return group.name;
  }
  return 'Other';
}

const productController = {
showShopping: (req, res) => {
  const search = (req.query.search || '').trim();
  const category = (req.query.category || 'All');

  const done = (err, products) => {
    if (err) return res.status(500).send('Error loading products');

    const decorated = (products || []).map(p => ({
      ...p,
      category: detectCategory(p.productName || p.name || '')
    }));

    const filtered = decorated.filter(p => {
      const matchesCategory = category === 'All' || p.category === category;
      return matchesCategory;
    });

    res.render('shopping', { products: filtered, search, category, categories: ['All', ...CATEGORY_MAP.map(c => c.name), 'Other'] });
  };

  if (search) {
    Product.searchProductsByName(search, done);
  } else {
    Product.getAllProducts(done);
  }
},


  showInventory: (req, res) => {
    const search = (req.query.search || '').trim();

    const done = (err, results) => {
      if (err) return res.status(500).send('Error loading inventory');
      res.render('inventory', { products: results, search });
    };

    if (search) {
      Product.searchProductsByName(search, done);
    } else {
      Product.getAllProducts(done);
    }
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
  },

  // ---------- UPDATE QUANTITY ONLY ----------
  updateQuantity: (req, res) => {
    const id = req.params.id;
    const quantity = parseInt(req.body.quantity, 10);

    if (Number.isNaN(quantity) || quantity < 0) {
      req.flash('error', 'Quantity must be a non-negative number.');
      return res.redirect('/inventory');
    }

    Product.updateQuantity(id, quantity, (err) => {
      if (err) {
        console.error('MYSQL ERROR (updateQuantity):', err);
        return res.status(500).send('Error updating quantity');
      }
      res.redirect('/inventory');
    });
  }
};

module.exports = productController;
