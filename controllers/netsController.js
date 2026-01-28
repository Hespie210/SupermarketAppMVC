// controllers/netsController.js
const Order = require('../models/orderModel');
const netsService = require('../services/nets');

function formatInvoiceNumber(id) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `INV-${y}${m}${d}-${id}`;
}

function getCartTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

function getResponseCodeMessage(code) {
  const messages = {
    '09': 'Request in progress.',
    '12': 'No matching transaction found.',
    '68': 'Transaction timed out.',
    '96': 'Invalid order state.',
    '99': 'System error.',
  };
  return messages[code] || 'NETS payment failed.';
}

function isHardFailureCode(code) {
  return ['12', '96', '99'].includes(code);
}

const netsController = {
  showNetsQr: async (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];

    if (!user) {
      return res.redirect('/login');
    }
    if (!cart.length) {
      return res.redirect('/cart');
    }

    const total = getCartTotal(cart);

    try {
      const responseData = await netsService.createQrForTotal(total.toFixed(2));
      const qrData = responseData && responseData.result && responseData.result.data
        ? responseData.result.data
        : (responseData && responseData.data ? responseData.data : responseData);

      if (
        qrData &&
        qrData.response_code === '00' &&
        qrData.txn_status === 1 &&
        qrData.qr_code
      ) {
        const txnRetrievalRef = qrData.txn_retrieval_ref;
        const courseInitId = netsService.getCourseInitIdParam();

        req.session.netsQr = {
          responseCode: 'PENDING',
          txnStatus: qrData.txn_status,
          txnRetrievalRef,
          courseInitId,
          total: total.toFixed(2),
          startedAt: Date.now(),
        };

        return res.render('netsQr', {
          title: 'Scan to Pay',
          total: total.toFixed(2),
          responseCode: 'PENDING',
          qrCodeUrl: `data:image/png;base64,${qrData.qr_code}`,
          txnRetrievalRef,
        });
      }

      let errorMsg = 'An error occurred while generating the QR code.';
      if (qrData && qrData.network_status !== 0) {
        errorMsg = qrData.error_message || 'Transaction failed. Please try again.';
      }

      return res.render('netsQrFail', {
        title: 'Error',
        responseCode: (qrData && qrData.response_code) || 'N.A.',
        instructions: (qrData && qrData.instruction) || '',
        errorMsg,
      });
    } catch (error) {
      console.error('Error in showNetsQr:', error.message);
      return res.render('netsQrFail', {
        title: 'Error',
        responseCode: 'N.A.',
        instructions: '',
        errorMsg: 'Unable to start NETS QR payment. Please try again.',
      });
    }
  },

  checkNetsStatus: async (req, res) => {
    const user = req.session.user;
    const cart = req.session.cart || [];
    const netsQr = req.session.netsQr || {};

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!cart.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!netsQr.txnRetrievalRef) {
      return res.status(400).json({ error: 'NETS payment not initialized' });
    }

    let responseCode = '';
    let txnStatus = '';
    let isSuccess = false;
    let isFailure = false;
    try {
      const result = await netsService.fetchPaymentStatus({
        txnRetrievalRef: netsQr.txnRetrievalRef,
        courseInitId: netsQr.courseInitId || netsService.getCourseInitIdParam(),
      });
      responseCode = (result && result.status && result.status.responseCode) || '';
      txnStatus = (result && result.status && result.status.txnStatus) || '';
      isSuccess = !!(result && result.isSuccess);
      isFailure = !!(result && result.isFailure);
    } catch (error) {
      console.error('NETS status check error:', error.message);
    }

    if (isFailure) {
      const errorMsg = getResponseCodeMessage(responseCode);
      req.session.netsQr.responseCode = responseCode || req.session.netsQr.responseCode || 'FAILED';
      return res.json({ status: 'failed', responseCode: responseCode || 'N.A.', error: errorMsg });
    }

    if (!isSuccess && (!responseCode || responseCode === '09' || responseCode === '68')) {
      req.session.netsQr.responseCode = responseCode || req.session.netsQr.responseCode || 'PENDING';
      return res.json({ status: 'pending', responseCode: responseCode || 'N.A.' });
    }

    if (responseCode !== '00' && isHardFailureCode(responseCode)) {
      const errorMsg = getResponseCodeMessage(responseCode);
      req.session.netsQr.responseCode = responseCode;
      return res.json({ status: 'failed', responseCode, error: errorMsg });
    }

    if (responseCode !== '00') {
      req.session.netsQr.responseCode = responseCode;
      return res.json({ status: 'pending', responseCode });
    }

    const userId = user.id;
    const totals = {
      total: getCartTotal(cart),
      tax: 0,
    };
    const invoiceNumber = formatInvoiceNumber(Date.now());
    const paymentMethod = 'NETS QR';

    Order.createOrder(userId, cart, totals, invoiceNumber, (err, result) => {
      if (err) {
        console.error('Error creating NETS order:', err);
        return res.status(500).json({ error: err.message || 'Error completing purchase' });
      }

      const orderId = result.orderId;
      req.session.lastPaymentMethod = paymentMethod;
      if (!req.session.orderMeta) req.session.orderMeta = {};
      req.session.orderMeta[orderId] = { paymentMethod, paymentRef: netsQr.txnRetrievalRef };
      Order.updatePaymentMeta(orderId, { paymentMethod, paymentRef: netsQr.txnRetrievalRef }, (metaErr) => {
        if (metaErr) {
          console.error('Error saving NETS payment ref:', metaErr);
        }
      });
      req.session.cart = [];
      delete req.session.netsQr;

      return res.json({ status: 'success', orderId });
    });
  },
};

module.exports = netsController;
