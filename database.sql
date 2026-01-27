-- PokeHaven hybrid schema (MySQL + Pokémon TCG API IDs)
-- Run with: mysql -u <user> -p < sql/pokehaven_schema.sql

CREATE DATABASE IF NOT EXISTS `pokehaven` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `pokehaven`;

-- Users
CREATE TABLE IF NOT EXISTS users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('buyer','seller','admin') DEFAULT 'buyer',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY unique_username (username),
  UNIQUE KEY unique_email (email)
) ENGINE=InnoDB;

-- Orders + items
CREATE TABLE IF NOT EXISTS orders (
  order_id INT NOT NULL AUTO_INCREMENT,
  buyer_id INT NOT NULL,
  order_status ENUM('pending','paid','shipped','completed','cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY idx_orders_buyer (buyer_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (buyer_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  api_card_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_item_id),
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT chk_order_items_qty CHECK (quantity > 0),
  CONSTRAINT chk_order_items_price CHECK (unit_price >= 0),
  CONSTRAINT chk_order_items_subtotal CHECK (subtotal >= 0)
) ENGINE=InnoDB;

-- Cart and favorites store API card IDs, not local card rows
CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  api_card_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  added_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cart_item_id),
  UNIQUE KEY unique_cart_user_card (user_id, api_card_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  favorite_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  api_card_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (favorite_id),
  UNIQUE KEY unique_fav_user_card (user_id, api_card_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Optional: lightweight card cache to avoid excessive API calls
CREATE TABLE IF NOT EXISTS card_cache (
  api_card_id VARCHAR(50) NOT NULL, -- ID from Pokémon TCG API
  card_name VARCHAR(120) NULL,
  set_name VARCHAR(100) NULL,
  rarity VARCHAR(50) NULL,
  image_url VARCHAR(255) NULL,
  last_synced TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (api_card_id)
) ENGINE=InnoDB;
