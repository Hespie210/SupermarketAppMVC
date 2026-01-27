-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: c372_supermarketdb
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `orderId` bigint NOT NULL,
  `productId` bigint NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `orderId` (`orderId`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,2,12,0.80,0.00),(2,2,21,8,1.60,0.00),(3,2,22,6,2.30,0.00),(4,3,3,1,3.50,0.00),(5,4,2,6,0.80,0.00),(6,6,2,6,0.80,4.80),(7,7,2,6,0.80,4.80),(8,8,3,5,3.50,17.50),(9,9,2,1,0.80,0.80),(10,10,2,1,0.80,0.80),(11,11,2,1,0.80,0.80),(12,12,2,7,0.80,5.60),(13,13,2,2,0.80,1.60),(14,14,2,2,0.80,1.60),(15,15,2,5,0.80,4.00),(16,15,3,4,3.50,14.00),(18,17,3,1,3.50,3.50),(19,18,3,35,3.50,122.50),(20,19,2,40,0.80,32.00),(21,20,19,82,5.00,410.00),(22,21,21,4,1.60,6.40),(23,22,24,5,2.30,11.50),(24,23,23,1,3.40,3.40),(25,24,23,4,3.40,13.60),(26,25,21,4,1.60,6.40),(27,26,2,6,0.80,4.80),(28,27,3,3,3.50,10.50),(29,28,2,4,0.80,3.20),(30,29,25,2,2.30,4.60),(31,30,25,50,2.30,115.00),(33,32,3,4,3.50,14.00),(34,33,3,4,3.50,14.00),(35,34,19,1,5.00,5.00),(36,35,3,6,3.50,21.00),(37,36,3,4,3.50,14.00),(38,37,26,30,6.00,180.00);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) NOT NULL DEFAULT 'Processing',
  `invoiceNumber` varchar(32) NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,15,'2025-11-26 15:06:01','Out for Delivery','',0.00,0.00),(2,15,'2025-11-26 15:14:41','Ready for Pickup','',0.00,0.00),(3,16,'2025-11-26 15:19:59','Packing','',0.00,0.00),(4,16,'2025-11-26 15:39:36','Processing','',0.00,0.00),(6,16,'2025-11-26 15:51:15','Ready for Pickup','INV-20251126-1764143475259',4.80,0.00),(7,16,'2025-11-26 15:53:09','Packing','INV-20251126-1764143589569',4.80,0.00),(8,16,'2025-11-27 01:18:51','Completed','INV-20251127-1764177531634',17.50,0.00),(9,17,'2025-11-27 13:28:16','Processing','INV-20251127-1764221296012',0.80,0.00),(10,18,'2025-11-27 13:36:07','Processing','INV-20251127-1764221767323',0.80,0.00),(11,19,'2025-11-27 13:37:22','Processing','INV-20251127-1764221842116',0.80,0.00),(12,20,'2025-11-27 13:46:16','Processing','INV-20251127-1764222376702',5.60,0.00),(13,20,'2025-11-27 13:47:12','Processing','INV-20251127-1764222432827',1.60,0.00),(14,20,'2025-11-27 13:48:59','Packing','INV-20251127-1764222539317',1.60,0.00),(15,22,'2025-11-27 14:05:49','Ready for Pickup','INV-20251127-1764223549693',18.00,0.00),(17,26,'2025-11-27 14:20:41','Processing','INV-20251127-1764224441899',3.50,0.00),(18,26,'2025-11-27 14:21:02','Processing','INV-20251127-1764224462177',122.50,0.00),(19,26,'2025-11-27 14:21:20','Processing','INV-20251127-1764224480994',32.00,0.00),(20,26,'2025-11-27 14:21:36','Ready for Pickup','INV-20251127-1764224496218',410.00,0.00),(21,28,'2025-11-27 14:26:28','Processing','INV-20251127-1764224788088',6.40,0.00),(22,28,'2025-11-27 14:28:45','Processing','INV-20251127-1764224925109',11.50,0.00),(23,28,'2025-11-27 14:29:03','Processing','INV-20251127-1764224943113',3.40,0.00),(24,28,'2025-11-27 14:31:21','Processing','INV-20251127-1764225081879',13.60,0.00),(25,28,'2025-11-27 14:31:37','Processing','INV-20251127-1764225097686',6.40,0.00),(26,29,'2025-11-27 15:27:08','Cancelled','INV-20251127-1764228428890',4.80,0.00),(27,30,'2025-11-27 15:30:03','Ready for Pickup','INV-20251127-1764228603690',10.50,0.00),(28,31,'2025-11-27 15:44:34','Cancelled','INV-20251127-1764229474891',3.20,0.00),(29,32,'2025-11-27 15:54:29','Completed','INV-20251127-1764230069017',4.60,0.00),(30,33,'2025-11-27 16:04:10','Cancelled','INV-20251127-1764230650221',115.00,0.00),(32,34,'2025-11-27 16:21:03','Cancelled','INV-20251127-1764231663309',14.00,0.00),(33,34,'2025-11-27 16:21:20','Ready for Pickup','INV-20251127-1764231680301',14.00,0.00),(34,35,'2025-11-27 16:38:15','Cancelled','INV-20251127-1764232695568',5.00,0.00),(35,36,'2025-11-28 09:47:09','Cancelled','INV-20251128-1764294429531',21.00,0.00),(36,37,'2025-11-28 09:51:45','Refunded','INV-20251128-1764294705875',14.00,0.00),(37,38,'2025-11-28 09:56:42','Processing','INV-20251128-1764295002640',180.00,0.00);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` double(10,2) NOT NULL,
  `image` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (3,'Milk',22,3.50,'milk.png'),(21,'Apples',47,1.60,'1763657942440.png'),(23,'Tomato',51,3.40,'1764177462598.png'),(24,'Bread',61,2.30,'1764222987958.png'),(25,'Bananas',44,2.30,'1764230030194.png'),(27,'Broccoli',66,3.00,'1764901673919.png');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `productId` int NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) NOT NULL DEFAULT 'Processing',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `productId` (`productId`),
  CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `purchases_ibfk_2` FOREIGN KEY (`productId`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (9,12,3,14,3.50,'2025-11-20 17:10:40','Processing');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `contact` varchar(10) NOT NULL,
  `role` varchar(10) NOT NULL,
  `profileImage` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Peter Lim','peter@peter.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Woodlands Ave 2','98765432','admin',NULL),(2,'Mary Tan','mary@mary.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Tampines Ave 1','12345678','user',NULL),(3,'bobochan','bobochan@gmail.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Woodlands','98765432','user',NULL),(4,'sarahlee','sarahlee@gmail.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Woodlands','98765432','user',NULL),(5,'test','test1@test.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Woodlands','987654321','deleted',NULL),(6,'admin','admin@test.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Ang Mo Kio','87654321','admin',NULL),(11,'test','test1@test.com','$2b$10$gvfB6jaz9k7anGd0Obp3DuLQDT7v2DgfsyxxNNW.tDQyZjxBTzxA.','Ang Mo Kio','87654321','deleted','1764223097476.jpg'),(12,'admin','admin2@gmail.com','$2b$10$xKOdGC3Wx6I8BsdFFqr48ek.SB2bBSW0HdL1Jxgf6ba47GCyuNgHS','Ang Mo Kio','87654321','admin','1764224638627.jpg'),(19,'Hespie','hespiecya@gmail.com','$2b$10$bdUtlWpMMCGjKdcmbyBgfOzscQhxNM2IxyJcUlmKim7IQoOHxicLa','Ang Mo Kio','81611052','deleted',NULL),(20,'Hespie','hespiecya@gmail.com','$2b$10$iDBiQicHJTlElj4Tea9Vau5vFe8.KbGy0K0Aq8Wwhfshwie5PjXvy','Ang Mo Kio','81611052','deleted',NULL),(21,'Hespie','hespiecya@gmail.com','$2b$10$fEvSkeO/b/kshatIYry74evMsn2gGLIFBOMnLgHQPhSEoPmzX0BMG','Ang Mo Kio','81611052','deleted',NULL),(22,'Hespie','hespiecya@gmail.com','$2b$10$.erMkBMPBsbMH7iMKEyaXeSLbYMFwtyWIFW3pZrrZkX4p53IFKT8.','Ang Mo Kio','81611052','deleted','1764223619418.jpg'),(23,'Hespie Amir','hespie1@gmail.com','$2b$10$BCTD0bFisM6h.daHegdile5uZPzSiqEOnboBrDiDrNR9gMGN4dM9C','Ang Mo Kio','81611052','deleted',NULL),(24,'Hespie Amir','hespie1@gmail.com','$2b$10$S5MJkBznHexMqeDVreBoF.AQXpXI6jEQCbLsQ0bD1dVCwfEMFG.I.','Ang Mo Kio','81611052','deleted',NULL),(25,'Hespie','hespiecya@gmail.com','$2b$10$xxCOo5z.Yk2FEM5HSucRUOEaQ1qhnwLbXuEfOcT8.D5aobrwWqILy','Ang Mo Kio','81611052','deleted',NULL),(26,'user1@user.com','user1@user.com','$2b$10$kWbcVCsAzhDkMXZYVPSB2.iQBU4e8GxqO6GrdkQMxbdbv2K4wvkKG','piunggol110','1234567890','deleted',NULL),(27,'Hespie','hespiecya@gmail.com','$2b$10$F6AYyW8lJvMe.59ZKYs71ubfPasRZ.fm.xzx59h894QX1y1dHhk8i','Ang Mo Kio','81611052','deleted',NULL),(28,'Hespie','hespiecya@gmail.com','$2b$10$nRW5pzcpKmQjYNGKWnzVH.WllqZDo7S9y1XBUnUbkjT93XKuGKpJu','Ang Mo Kio','81611052','deleted',NULL),(29,'Hespie','hespiecya@gmail.com','$2b$10$eoqe0lIh8aEJWg0a3TjNpOG/jIhEbDQGHZkopVS6/nxamfMbjKP/u','Ang Mo Kio','81611052','deleted',NULL),(30,'Hespie','hespiecya@gmail.com','$2b$10$qewwjssS7D1NX9VvFKX0IeVnYdXFjGfbXFEqrvl6r.jI3f8WALnou','Ang Mo Kio','81611052','deleted',NULL),(31,'123123','123@mail.com','$2b$10$/wUAXCyIKT1Djm4GoA6CsOCza09JLdUzs7rUtTB0Km0GdjJjbxiM2','Woodlands','123123312','deleted',NULL),(32,'Hespie','hespiecya@gmail.com','$2b$10$rwBIxptMGISl/fTlGm/KPep3DA0XE0Wx2TtxEpnMv6avGw9e.HOvy','Ang Mo Kio','81611052','deleted',NULL),(33,'User','user1@user.com','$2b$10$Yjies5baWemNxk1SvnHS1uXFqXUYsudZall9PVm2c2zmYrqyxavsS','Ang Mo Kio','81611052','deleted',NULL),(34,'Hespie','hespiecya@gmail.com','$2b$10$xdWwP/OnVjISEZ8KFAOFDuP3LuL1S9C6kuYGjSCMWVMuqCtjQ/ESG','Ang Mo Kio','81611052','deleted','1764231731474.jpg'),(35,'Hespie','hespiecya@gmail.com','$2b$10$5lFau6m6YGrBveQM2LNgSO7JFLX53NY5DuIxl.rZ.qNnAyqYlMFeG','Ang Mo Kio','81611052','deleted',NULL),(36,'Hespie','hespiecya@gmail.com','$2b$10$Cpkj1l3azKfXxQhctACaCOIUC1iSbOaKy4/egmyfiAi3uBqQAiqQ.','Ang Mo Kio','81611052','deleted','1764294463670.jpg'),(37,'Hespie','hespiecya@gmail.com','$2b$10$V2GdceBpMAz/FzoVbGvN8.MM.s8mMt6s7QZ/uyv4gT61oy4uFj.N6','Ang Mo Kio','81611052','deleted','1764294753134.jpg'),(38,'Hespie','hespiecya@gmail.com','$2b$10$u21r6ZDrPskdLY4KpnXLRu9mHX81jnL4no8GDcAoy1E953c64QZ7K','Ang Mo Kio','81611052','user',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlist`
--

DROP TABLE IF EXISTS `wishlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  KEY `fk_wishlist_product` (`product_id`),
  CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlist`
--

LOCK TABLES `wishlist` WRITE;
/*!40000 ALTER TABLE `wishlist` DISABLE KEYS */;
INSERT INTO `wishlist` VALUES (18,34,25,'2025-11-27 08:23:49',6),(19,36,3,'2025-11-28 01:47:24',5);
/*!40000 ALTER TABLE `wishlist` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-05 11:59:52
