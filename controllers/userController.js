// controllers/userController.js
// User profile and store-credit top-up flows.
const User = require('../models/userModel');
const StoreCredit = require('../models/storeCreditModel');
const netsService = require('../services/nets');

// Map NETS response codes to display messages.
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

const userController = {
  // Internal helper: load recent store credit history.
  _loadStoreCreditHistory: (userId, callback) => {
    StoreCredit.getHistoryByUser(userId, 10, (err, history) => {
      if (err) {
        console.error('Error loading store credit history:', err);
        return callback(null, []);
      }
      callback(null, history || []);
    });
  },

  // Show profile page with latest DB data.
  showProfile: (req, res) => {
    const userId = req.session.user.id;

    // Always get the latest data from DB
    User.getUserById(userId, (err, user) => {
      if (err) {
        console.error('Error loading profile:', err);
        return res.status(500).send('Error loading profile');
      }
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Refresh session so navbar etc. are in sync
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      };

      res.render('profile', { currentUser: req.session.user });
    });
  },

  // Handle profile photo upload and update session.
  uploadProfilePhoto: (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const filename = req.file.filename;
    const userId = req.session.user.id;

    User.updateProfileImage(userId, filename, (err) => {
      if (err) {
        console.error('Error saving profile image:', err);
        return res.status(500).send('Error saving profile image');
      }

      // Update session so navbar/profile update immediately
      req.session.user.profileImage = filename;

      res.redirect('/profile');
    });
  },

  // Show store credit balance + history + top-up form.
  showStoreCredit: (req, res) => {
    const userId = req.session.user.id;

    if (req.session.netsTopup && req.session.netsTopup.completed) {
      delete req.session.netsTopup;
    }

    User.getStoreCredit(userId, (err, storeCredit) => {
      if (err) {
        console.error('Error loading store credit:', err);
      }
      userController._loadStoreCreditHistory(userId, (historyErr, history) => {
        if (historyErr) {
          console.error('Error loading store credit history:', historyErr);
        }
        res.render('storeCredit', {
          storeCredit: err ? 0 : storeCredit,
          history: history || [],
          qrCodeUrl: null,
          amount: null,
          responseCode: null,
          errorMsg: null,
          successMsg: null
        });
      });
    });
  },

  // Create a NETS QR code for store credit top-up.
  createStoreCreditQr: async (req, res) => {
    const userId = req.session.user.id;
    const rawAmount = (req.body.amount || '').toString().trim();
    const amount = Number(rawAmount);
    const currentBalance = typeof res.locals.storeCredit === 'number' ? res.locals.storeCredit : 0;

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return userController._loadStoreCreditHistory(userId, (historyErr, history) => {
        if (historyErr) {
          console.error('Error loading store credit history:', historyErr);
        }
        return res.status(400).render('storeCredit', {
          storeCredit: currentBalance,
          history: history || [],
          qrCodeUrl: null,
          amount: null,
          responseCode: null,
          errorMsg: 'Please enter a valid top-up amount.',
          successMsg: null
        });
      });
    }

    let storeCredit = 0;
    try {
      storeCredit = await new Promise((resolve, reject) => {
        User.getStoreCredit(userId, (err, credit) => {
          if (err) return reject(err);
          resolve(credit || 0);
        });
      });
    } catch (err) {
      console.error('Error loading store credit:', err);
    }

    try {
      const responseData = await netsService.createQrForTotal(amount.toFixed(2));
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

        req.session.netsTopup = {
          responseCode: 'PENDING',
          txnStatus: qrData.txn_status,
          txnRetrievalRef,
          courseInitId,
          amount: amount.toFixed(2),
          startedAt: Date.now(),
          credited: false,
          completed: false
        };

        return userController._loadStoreCreditHistory(userId, (historyErr, history) => {
          if (historyErr) {
            console.error('Error loading store credit history:', historyErr);
          }
          return res.render('storeCredit', {
            storeCredit,
            history: history || [],
            qrCodeUrl: `data:image/png;base64,${qrData.qr_code}`,
            amount: amount.toFixed(2),
            responseCode: 'PENDING',
            errorMsg: null,
            successMsg: null
          });
        });
      }

      let errorMsg = 'An error occurred while generating the QR code.';
      if (qrData && qrData.network_status !== 0) {
        errorMsg = qrData.error_message || 'Transaction failed. Please try again.';
      }

      return userController._loadStoreCreditHistory(userId, (historyErr, history) => {
        if (historyErr) {
          console.error('Error loading store credit history:', historyErr);
        }
        return res.render('storeCredit', {
          storeCredit,
          history: history || [],
          qrCodeUrl: null,
          amount: null,
          responseCode: (qrData && qrData.response_code) || 'N.A.',
          errorMsg,
          successMsg: null
        });
      });
    } catch (error) {
      console.error('Error creating NETS QR top-up:', error.message);
      return userController._loadStoreCreditHistory(userId, (historyErr, history) => {
        if (historyErr) {
          console.error('Error loading store credit history:', historyErr);
        }
        return res.render('storeCredit', {
          storeCredit,
          history: history || [],
          qrCodeUrl: null,
          amount: null,
          responseCode: 'N.A.',
          errorMsg: 'Unable to start NETS QR top-up. Please try again.',
          successMsg: null
        });
      });
    }
  },

  // Poll NETS status and apply store credit if paid.
  checkStoreCreditStatus: async (req, res) => {
    const user = req.session.user;
    const netsTopup = req.session.netsTopup || {};

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!netsTopup.txnRetrievalRef) {
      return res.status(400).json({ error: 'NETS top-up not initialized' });
    }

    if (netsTopup.completed && netsTopup.credited) {
      return User.getStoreCredit(user.id, (err, credit) => {
        if (err) {
          console.error('Error loading store credit:', err);
        }
        return res.json({
          status: 'success',
          responseCode: netsTopup.responseCode || '00',
          balance: err ? 0 : credit
        });
      });
    }

    let responseCode = '';
    let isSuccess = false;
    let isFailure = false;
    try {
      const result = await netsService.fetchPaymentStatus({
        txnRetrievalRef: netsTopup.txnRetrievalRef,
        courseInitId: netsTopup.courseInitId || netsService.getCourseInitIdParam(),
      });
      responseCode = (result && result.status && result.status.responseCode) || '';
      isSuccess = !!(result && result.isSuccess);
      isFailure = !!(result && result.isFailure);
    } catch (error) {
      console.error('NETS top-up status check error:', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        type: error?.type,
        txnRetrievalRef: netsTopup.txnRetrievalRef,
        userId: user.id
      });
    }

    if (isFailure) {
      const errorMsg = getResponseCodeMessage(responseCode);
      req.session.netsTopup.responseCode = responseCode || req.session.netsTopup.responseCode || 'FAILED';
      return res.json({ status: 'failed', responseCode: responseCode || 'N.A.', error: errorMsg });
    }

    if (!isSuccess && (!responseCode || responseCode === '09' || responseCode === '68')) {
      req.session.netsTopup.responseCode = responseCode || req.session.netsTopup.responseCode || 'PENDING';
      return res.json({ status: 'pending', responseCode: responseCode || 'N.A.' });
    }

    if (responseCode !== '00' && isHardFailureCode(responseCode)) {
      const errorMsg = getResponseCodeMessage(responseCode);
      req.session.netsTopup.responseCode = responseCode;
      return res.json({ status: 'failed', responseCode, error: errorMsg });
    }

    if (responseCode !== '00') {
      req.session.netsTopup.responseCode = responseCode;
      return res.json({ status: 'pending', responseCode });
    }

    const amount = Number(netsTopup.amount || 0);
    if (!amount || Number.isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid top-up amount' });
    }

    User.addStoreCredit(user.id, amount, (err) => {
      if (err) {
        console.error('Error applying store credit top-up:', err);
        return res.status(500).json({ error: err.message || 'Unable to apply store credit top-up' });
      }
      StoreCredit.addTransaction(user.id, amount, 'topup', netsTopup.txnRetrievalRef, (historyErr) => {
        if (historyErr) {
          console.error('Error saving store credit history:', historyErr);
        }
      });
      req.session.netsTopup.completed = true;
      req.session.netsTopup.credited = true;
      req.session.netsTopup.responseCode = responseCode || '00';

      User.getStoreCredit(user.id, (err2, credit) => {
        if (err2) {
          console.error('Error loading store credit:', err2);
        }
        return res.json({
          status: 'success',
          responseCode: responseCode || '00',
          balance: err2 ? 0 : credit
        });
      });
    });
  }
};

module.exports = userController;
