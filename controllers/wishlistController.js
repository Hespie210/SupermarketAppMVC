// controllers/wishlistController.js
const Wishlist = require('../models/wishlistModel'); // make sure file name matches
const Product = require('../models/productModel');

const wishlistController = {
  // Show all items in the current user's wishlist
  showWishlist: (req, res) => {
    const userId = req.session.user.id;

    Wishlist.getItemsByUser(userId, (err, rows) => {
      if (err) return res.status(500).send('Error loading wishlist');

      const ids = rows.map(r => r.product_id); // matches your wishListModel + DB

      if (ids.length === 0) {
        return res.render('wishlist', { products: [] });
      }

      Product.getProductsByIds(ids, (err2, products) => {
        if (err2) return res.status(500).send('Error loading wishlist products');
        res.render('wishlist', { products });
      });
    });
  },

  // Add a product to wishlist
  addToWishlist: (req, res) => {
    const userId = req.session.user.id;
    const productId = parseInt(req.params.id, 10);

    Wishlist.addItem(userId, productId, (err) => {
      if (err) return res.status(500).send('Error adding to wishlist');
      res.redirect('/shopping');
    });
  },

  // Remove a product from wishlist
  removeFromWishlist: (req, res) => {
    const userId = req.session.user.id;
    const productId = parseInt(req.params.id, 10);

    Wishlist.removeItem(userId, productId, (err) => {
      if (err) return res.status(500).send('Error removing from wishlist');
      res.redirect('/wishlist');
    });
  }
};

module.exports = wishlistController;
