// controllers/cartController.js
const Product = require('../models/productModel');
const Purchase = require('../models/purchaseModel');

const cartController = {
  // Show cart
  showCart: (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    res.render('cart', { cart, total });
  },

  // Add product to cart
  // Route: POST /add-to-cart/:id
  addToCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    Product.getProductById(productId, (err, product) => {
      if (err || !product) {
        console.error('Error fetching product for cart:', err);
        // If product not found, just go back to cart
        return res.redirect('/cart');
      }

      if (!req.session.cart) req.session.cart = [];
      const cart = req.session.cart;

      const existingIndex = cart.findIndex(
        item => item.productId === product.id
      );

      if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push({
          productId: product.id,
          name: product.productName || product.name, // support both field names
          price: Number(product.price),
          quantity,
          image: product.image || null
        });
      }

      req.session.cart = cart;
      res.redirect('/cart');
    });
  },

  // Remove item from cart
  // Route: POST /cart/remove/:id
  removeFromCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const cart = req.session.cart || [];
    const newCart = cart.filter(item => item.productId !== productId);
    req.session.cart = newCart;
    res.redirect('/cart');
  },

  // ✅ Clear entire cart
  // Route: POST /cart/clear
  clearCart: (req, res) => {
    req.session.cart = [];
    res.redirect('/cart');
  },

  // Checkout: save purchases + clear cart
  // Route: POST /checkout
  checkout: (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];
    const paymentMethod = (req.body.paymentMethod || '').trim();

    if (!user) {
      return res.redirect('/login');
    }

    if (!cart.length) {
      return res.redirect('/cart');
    }

    if (!paymentMethod) {
      req.flash('error', 'Please select a payment method.');
      return res.redirect('/cart');
    }

    const userId = user.id;
    const orderNumber = Math.floor(Date.now() / 1000); // align with UNIX timestamp used in receipts

    req.session.lastPaymentMethod = paymentMethod;
    if (!req.session.orderMeta) req.session.orderMeta = {};
    req.session.orderMeta[orderNumber] = { paymentMethod };

    Purchase.createPurchases(userId, cart, err => {
      if (err) {
        console.error('Error creating purchases:', err);
        return res.status(500).send('Error completing purchase');
      }

      // Clear cart after successful purchase
      req.session.cart = [];
      req.flash('success', `Order placed! Order #${orderNumber} via ${paymentMethod}.`);
      res.redirect('/my-purchases');
    });
  },

  // Summary: one row per checkout for this user
  // Route: GET /my-purchases
  showPurchases: (req, res) => {
    const userId = req.session.user.id;

    Purchase.getReceiptSummariesByUserId(userId, (err, purchases) => {
      if (err) {
        console.error('Error retrieving purchase summaries:', err);
        return res.status(500).send('Error retrieving purchases');
      }
      const meta = req.session.orderMeta || {};

      // Try to backfill the most recent purchase with the last payment method if missing
      if (purchases && purchases.length) {
        const recent = purchases[0];
        const ts = recent.receiptTimestamp;
        if (!meta[ts] && req.session.lastPaymentMethod) {
          meta[ts] = { paymentMethod: req.session.lastPaymentMethod };
          req.session.orderMeta = meta;
        }
      }

      const enhanced = (purchases || []).map(p => ({
        ...p,
        orderNumber: p.receiptTimestamp,
        paymentMethod: meta[p.receiptTimestamp]?.paymentMethod || 'N/A'
      }));
      res.render('purchases', { purchases: enhanced });
    });
  },

  // Detailed receipt view for ONE checkout (current user)
  // Route: GET /my-purchases/:timestamp
  showReceiptDetails: (req, res) => {
    const userId = req.session.user.id;
    const receiptTimestamp = parseInt(req.params.timestamp, 10);

    Purchase.getReceiptDetails(userId, receiptTimestamp, (err, items) => {
      if (err) {
        console.error('Error loading receipt details:', err);
        return res.status(500).send('Error loading receipt');
      }

      if (!items || !items.length) {
        return res.status(404).send('Receipt not found');
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
      );

      const meta = req.session.orderMeta || {};
      const paymentMethod = meta[receiptTimestamp]?.paymentMethod || 'N/A';

      res.render('receiptDetails', {
        items,
        totalAmount,
        receiptDate: items[0].createdAt,
        orderNumber: receiptTimestamp,
        paymentMethod
      });
    });
  }
};

module.exports = cartController;
