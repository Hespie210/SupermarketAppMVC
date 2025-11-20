// controllers/cartController.js
const db = require('../db');
const Product = require('../models/productModel');
const Purchase = require('../models/purchaseModel');

const cartController = {
  showCart: (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart });
  },

  addToCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    Product.getProductById(productId, (err, product) => {
      if (err) return res.status(500).send('Error adding to cart');
      if (!product) return res.status(404).send('Product not found');

      if (!req.session.cart) req.session.cart = [];

      const existingItem = req.session.cart.find(item => item.productId === productId);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        req.session.cart.push({
          productId: product.id,
          productName: product.productName,
          price: Number(product.price),
          quantity: quantity,
          image: product.image
        });
      }

      res.redirect('/cart');
    });
  },

  removeFromCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    if (req.session.cart) {
      req.session.cart = req.session.cart.filter(item => item.productId !== productId);
    }
    res.redirect('/cart');
  },

  clearCart: (req, res) => {
    req.session.cart = [];
    res.redirect('/cart');
  },

  checkout: (req, res) => {
    const cart = req.session.cart || [];
    const user = req.session.user;

    if (!cart.length) {
      req.flash('error', 'Your cart is empty.');
      return res.redirect('/cart');
    }

    Purchase.createPurchases(user.id, cart, (err) => {
      if (err) return res.status(500).send('Error during checkout');

      // Reduce stock for each product
      const updateSql = 'UPDATE products SET quantity = quantity - ? WHERE id = ?';
      cart.forEach(item => {
        db.query(updateSql, [item.quantity, item.productId]);
      });

      req.session.cart = [];
      req.flash('success', 'Checkout successful!');
      res.redirect('/my-purchases');
    });
  },

  showPurchases: (req, res) => {
    const userId = req.session.user.id;

    Purchase.getPurchasesByUserId(userId, (err, purchases) => {
      if (err) return res.status(500).send('Error retrieving purchases');
      res.render('purchases', { purchases });
    });
  }
};

module.exports = cartController;
