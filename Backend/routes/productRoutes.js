const express = require("express");
const { logger } = require("../utils/logger");
const { authorize } = require("../middleware/authMiddleware");
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();
const productController = require("../controllers/productController");

logger.info("Request to productRoutes.js has entered");

// POST /product/addProduct
router.post(
  "/addProduct",
  authorize,
  upload.single('image'), // middleware works because you fixed uploadMiddleware
  productController.addProduct
);


router.get(
  "/getProducts",
  authorize,
  productController.getProducts
);

logger.info("Request to productRoutes.js has exited");

module.exports = router; 
  
