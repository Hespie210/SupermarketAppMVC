// controllers/cartController.js
const db = require('../db');
const Product = require('../models/productModel');
const Purchase = require('../models/purchaseModel');

const cartController = {
  // Show cart
  showCart: (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.render('cart', { cart, total });
  },

  // Add product to cart
  addToCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    Product.getProductById(productId, (err, product) => {
      if (err || !product) {
        console.error('Error fetching product for cart:', err);
        return res.status(500).send('Error adding product to cart');
      }

      if (!req.session.cart) {
        req.session.cart = [];
      }

      const cart = req.session.cart;

      // Look for existing item
      const existing = cart.find(item => item.productId === productId);

      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,          // 👈 this is what we show in the view
          price: product.price,
          image: product.image,
          quantity: quantity
        });
      }

      req.session.cart = cart;
      res.redirect('/cart');
    });
  },

  // Remove one product from cart
  removeFromCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const cart = req.session.cart || [];

    req.session.cart = cart.filter(item => item.productId !== productId);
    res.redirect('/cart');
  },

  // Clear entire cart
  clearCart: (req, res) => {
    req.session.cart = [];
    res.redirect('/cart');
  },

  // Checkout: save purchases + clear cart
  checkout: (req, res) => {
    const userId = req.session.user.id;
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      return res.redirect('/cart');
    }

    Purchase.createPurchases(userId, cart, (err) => {
      if (err) {
        console.error('Error creating purchases:', err);
        return res.status(500).send('Error completing purchase');
      }

      // Clear cart after successful purchase
      req.session.cart = [];
      res.redirect('/my-purchases');
    });
  },

  // Show purchase history
  showPurchases: (req, res) => {
    const userId = req.session.user.id;

    Purchase.getPurchasesByUserId(userId, (err, purchases) => {
      if (err) {
        console.error('Error retrieving purchases:', err);
        return res.status(500).send('Error retrieving purchases');
      }
      res.render('purchases', { purchases });
    });
  }
};

module.exports = cartController;