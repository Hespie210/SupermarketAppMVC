// controllers/homeController.js

const homeController = {
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
