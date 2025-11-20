// middleware/authMiddleware.js

function checkAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function checkAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admins only.');
}

module.exports = {
  checkAuthenticated,
  checkAdmin
};
