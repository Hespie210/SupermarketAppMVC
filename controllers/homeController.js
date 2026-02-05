// controllers/homeController.js
// Landing page controller that redirects based on session role.

const homeController = {
  // If logged in: redirect to admin or shopping; otherwise show landing page.
  showHome: (req, res) => {
    if (req.session.user) {
      if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
      return res.redirect('/shopping');
    }
    // No session: show landing page
    return res.render('index');
  }
};

module.exports = homeController;
