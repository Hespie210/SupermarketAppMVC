// app.js
require('dotenv').config();                // <--- load .env FIRST

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();

// Ensure DB connects
require('./db');

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Sessions + flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret', // <--- from .env
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));
app.use(flash());

// Make user & flash available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', productRoutes);
app.use('/', cartRoutes);

// Start server
const PORT = process.env.PORT || 3000;     // <--- from .env if set
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});