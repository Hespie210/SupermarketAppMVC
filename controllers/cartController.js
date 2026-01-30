// controllers/cartController.js
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const paypalService = require('../services/paypal');
const stripeService = require('../services/stripe');

function formatInvoiceNumber(id) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `INV-${y}${m}${d}-${id}`;
}

const cartController = {
  // Show cart
  showCart: (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    res.render('cart', {
      cart,
      total,
      paypalClientId: process.env.PAYPAL_CLIENT_ID || ''
    });
  },

  // Add product to cart
  addToCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    Product.getProductById(productId, (err, product) => {
      if (err || !product) {
        console.error('Error fetching product for cart:', err);
        return res.redirect('/cart');
      }

      if (!req.session.cart) req.session.cart = [];
      const cart = req.session.cart;

      const existingIndex = cart.findIndex(item => item.productId === product.id);

      if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push({
          productId: product.id,
          name: product.productName || product.name,
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
  removeFromCart: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const cart = req.session.cart || [];
    const newCart = cart.filter(item => item.productId !== productId);
    req.session.cart = newCart;
    res.redirect('/cart');
  },

  // Update quantity for a cart item
  updateItemQuantity: (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const quantity = Math.max(1, parseInt(req.body.quantity, 10) || 1);
    const cart = req.session.cart || [];
    const idx = cart.findIndex(item => item.productId === productId);
    if (idx !== -1) {
      cart[idx].quantity = quantity;
      req.session.cart = cart;
    }
    res.redirect('/cart');
  },

  // Clear entire cart
  clearCart: (req, res) => {
    req.session.cart = [];
    res.redirect('/cart');
  },

  // Checkout: save order + items + clear cart
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
    const totals = {
      total: cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
      tax: 0
    };
    const invoiceNumber = formatInvoiceNumber(Date.now());

    Order.createOrder(userId, cart, totals, invoiceNumber, (err, result) => {
      if (err) {
        console.error('Error creating order:', err);
        req.flash('error', err.message || 'Error completing purchase');
        return res.redirect('/cart');
      }

      const orderId = result.orderId;
      req.session.lastPaymentMethod = paymentMethod;
      if (!req.session.orderMeta) req.session.orderMeta = {};
      req.session.orderMeta[orderId] = { paymentMethod };

      Order.updatePaymentMeta(orderId, { paymentMethod }, (metaErr) => {
        if (metaErr) {
          console.error('Error saving payment method:', metaErr);
        }
      });

      req.session.cart = [];
      req.flash('success', `Order placed! Order #${orderId} via ${paymentMethod}.`);
      res.redirect(`/invoice/${orderId}`);
    });
  },

  // Summary: one row per checkout for this user
  showPurchases: (req, res) => {
    const userId = req.session.user.id;

    Order.getOrdersByUser(userId, (err, orders) => {
      if (err) {
        console.error('Error retrieving purchase summaries:', err);
        return res.status(500).send('Error retrieving purchases');
      }
      const meta = req.session.orderMeta || {};

      const enhanced = (orders || []).map(o => ({
        ...o,
        orderNumber: o.id,
        paymentMethod: o.paymentMethod || meta[o.id]?.paymentMethod || 'N/A',
        status: o.status || 'Processing'
      }));
      res.render('purchases', { purchases: enhanced });
    });
  },

  // Detailed receipt view for ONE checkout (current user)
  showReceiptDetails: (req, res) => {
    const userId = req.session.user.id;
    const orderId = parseInt(req.params.orderId, 10);

    Order.getOrderDetailsByUser(userId, orderId, (err, items) => {
      if (err) {
        console.error('Error loading receipt details:', err);
        return res.status(500).send('Error loading receipt');
      }

      if (!items || !items.length) {
        return res.status(404).send('Receipt not found');
      }

      const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

      const meta = req.session.orderMeta || {};
      const paymentMethod = items[0]?.paymentMethod || meta[orderId]?.paymentMethod || 'N/A';
      const totalItems = items.reduce((sum, item) => sum + Number(item.quantity), 0);
      const tax = Number(items[0].tax || 0);

      res.render('receiptDetails', {
        items,
        totalAmount,
        receiptDate: items[0].createdAt,
        orderNumber: orderId,
        invoiceNumber: items[0].invoiceNumber || formatInvoiceNumber(orderId),
        paymentMethod,
        totalItems,
        userInfo: { name: items[0].username, email: items[0].email },
        status: items[0].status || 'Processing',
        tax,
        isAdmin: false
      });
    });
  },

  // PayPal: create order
  createPaypalOrder: async (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!cart.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const total = cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    try {
      const order = await paypalService.createOrder(total.toFixed(2));
      if (!order || !order.id) {
        return res.status(500).json({ error: 'PayPal order creation failed' });
      }
      return res.json({ id: order.id });
    } catch (err) {
      console.error('PayPal createOrder error:', err);
      return res.status(500).json({ error: 'PayPal order creation failed' });
    }
  },

  // PayPal: capture order + finalize local order
  capturePaypalOrder: async (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];
    const orderId = (req.body && req.body.orderId) || '';

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!cart.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!orderId) {
      return res.status(400).json({ error: 'Missing PayPal order id' });
    }

    try {
      const capture = await paypalService.captureOrder(orderId);
      if (!capture || capture.status !== 'COMPLETED') {
        return res.status(400).json({ error: 'PayPal payment not completed' });
      }

      const captureId =
        capture.purchase_units &&
        capture.purchase_units[0] &&
        capture.purchase_units[0].payments &&
        capture.purchase_units[0].payments.captures &&
        capture.purchase_units[0].payments.captures[0] &&
        capture.purchase_units[0].payments.captures[0].id;

      const userId = user.id;
      const totals = {
        total: cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
        tax: 0
      };
      const invoiceNumber = formatInvoiceNumber(Date.now());
      const paymentMethod = 'PayPal (Sandbox)';

      Order.createOrder(userId, cart, totals, invoiceNumber, (err, result) => {
        if (err) {
          console.error('Error creating PayPal order:', err);
          return res.status(500).json({ error: err.message || 'Error completing purchase' });
        }

        const newOrderId = result.orderId;
        req.session.lastPaymentMethod = paymentMethod;
        if (!req.session.orderMeta) req.session.orderMeta = {};
        req.session.orderMeta[newOrderId] = { paymentMethod, paymentRef: captureId };

        Order.updatePaymentMeta(newOrderId, { paymentMethod, paymentRef: captureId }, (metaErr) => {
          if (metaErr) {
            console.error('Error saving PayPal payment ref:', metaErr);
          }
        });
        req.session.cart = [];

        return res.json({ success: true, orderId: newOrderId });
      });
    } catch (err) {
      console.error('PayPal captureOrder error:', err);
      return res.status(500).json({ error: 'PayPal capture failed' });
    }
  },

  // Stripe: create checkout session
  createStripeCheckoutSession: async (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!cart.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
      const session = await stripeService.createCheckoutSession(cart, baseUrl);
      if (!session || !session.url) {
        return res.status(500).json({ error: 'Stripe session creation failed' });
      }
      req.session.stripeCheckout = {
        sessionId: session.id,
        total: cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
        createdAt: Date.now()
      };
      return res.json({ url: session.url, id: session.id });
    } catch (err) {
      console.error('Stripe create session error:', err.message);
      return res.status(500).json({ error: err.message || 'Stripe session creation failed' });
    }
  },

  // Stripe: success redirect
  stripeSuccess: async (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];
    const sessionId = req.query.session_id || '';

    if (!user) {
      return res.redirect('/login');
    }
    if (!sessionId) {
      req.flash('error', 'Missing Stripe session id.');
      return res.redirect('/cart');
    }

    if (!req.session.stripeOrders) req.session.stripeOrders = {};
    if (req.session.stripeOrders[sessionId]) {
      return res.redirect(`/invoice/${req.session.stripeOrders[sessionId]}`);
    }

    try {
      const session = await stripeService.retrieveSession(sessionId, {
        expand: ['payment_intent']
      });
      if (!session || session.payment_status !== 'paid') {
        req.flash('error', 'Stripe payment not completed.');
        return res.redirect('/cart');
      }

      if (!cart.length) {
        req.flash('error', 'Cart is empty. Unable to complete order.');
        return res.redirect('/cart');
      }

      const userId = user.id;
      const totals = {
        total: cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
        tax: 0
      };
      const invoiceNumber = formatInvoiceNumber(Date.now());
      const paymentMethod = 'Stripe';
      const paymentIntentId = session.payment_intent
        ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id)
        : sessionId;

      Order.createOrder(userId, cart, totals, invoiceNumber, (err, result) => {
        if (err) {
          console.error('Error creating Stripe order:', err);
          req.flash('error', err.message || 'Error completing purchase');
          return res.redirect('/cart');
        }

        const orderId = result.orderId;
        req.session.lastPaymentMethod = paymentMethod;
        if (!req.session.orderMeta) req.session.orderMeta = {};
        req.session.orderMeta[orderId] = { paymentMethod, paymentRef: paymentIntentId };
        Order.updatePaymentMeta(orderId, { paymentMethod, paymentRef: paymentIntentId }, (metaErr) => {
          if (metaErr) {
            console.error('Error saving Stripe payment ref:', metaErr);
          }
        });
        req.session.stripeOrders[sessionId] = orderId;
        req.session.cart = [];

        return res.redirect(`/invoice/${orderId}`);
      });
    } catch (err) {
      console.error('Stripe success error:', err.message);
      req.flash('error', 'Stripe verification failed.');
      return res.redirect('/cart');
    }
  },

  // Stripe: cancel redirect
  stripeCancel: (req, res) => {
    req.flash('error', 'Stripe checkout cancelled.');
    return res.redirect('/cart');
  },

  requestRefund: (req, res) => {
    const user = req.session.user;
    const orderId = parseInt(req.params.orderId, 10);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    Order.getOrderWithUser(orderId, (err, orderInfo) => {
      if (err || !orderInfo) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (orderInfo.userId !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const meta = req.session.orderMeta || {};
      const paymentMethod = orderInfo.paymentMethod || meta[orderId]?.paymentMethod || '';
      const methodLower = paymentMethod.toLowerCase();
      const isPaypal = methodLower.includes('paypal');
      const isStripe = methodLower.includes('stripe');
      if (!paymentMethod || (!isPaypal && !isStripe)) {
        return res.status(400).json({ error: 'Refunds are only available for PayPal or Stripe orders.' });
      }
      if (['Refunded', 'Refund Requested', 'Refund Rejected'].includes(orderInfo.status)) {
        return res.status(400).json({ error: 'Refund already requested or processed.' });
      }

      Order.updateStatus(orderId, 'Refund Requested', (err2) => {
        if (err2) {
          console.error('Error requesting refund:', err2);
          return res.status(500).json({ error: 'Unable to request refund.' });
        }
        return res.json({ success: true });
      });
    });
  }
};

module.exports = cartController;
