// controllers/homeController.js

const homeController = {
  showHome: (req, res) => {
    // You can render a landing page or redirect directly
    if (req.session.user) {
      if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
      return res.redirect('/shopping');
    }
    res.redirect('/login');
  }
};

module.exports = homeController;
