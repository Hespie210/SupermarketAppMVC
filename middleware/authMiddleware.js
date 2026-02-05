// middleware/authMiddleware.js
// Simple auth/role gates for route protection.

// Require a logged-in session.
function checkAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Require admin role.
function checkAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admins only.');
}

// Block admins from user-only pages (redirect to inventory).
function checkNonAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role === 'admin') {
    return res.redirect('/inventory');
  }
  return next();
}

module.exports = {
  checkAuthenticated,
  checkAdmin,
  checkNonAdmin
};
