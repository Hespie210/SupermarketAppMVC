// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Republic_C207',            // <-- put your password if you have one
  database: 'c372_supermarketdb' // <-- make sure this is your DB name
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

module.exports = db;   // <-- IMPORTANT: export the connection itself
