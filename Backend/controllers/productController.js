const asyncHandler = require("../utils/AsyncHandling");
const { createResponse } = require("../utils/ResponseHandling");
const Product = require("../models/Product");
const { logger } = require("../utils/logger");
const cloudinary = require("../utils/CloudinaryConfig");
const { Readable } = require("stream");
const User = require("../models/User");


const addProduct = asyncHandler(async (req, res) => {
  logger.info("Request to productController.addProduct has entered");
  logger.info("User category: " + req.user?.category);

  if (req.user.category !== "Seller") {
    return createResponse(res, 403, "Only sellers can add products", [], false);
  }

  const { name, description, price, status, quantityAvailable } = req.body;

  if (!name || !description || !price || !quantityAvailable) {
    return createResponse(res, 400, "All required fields must be filled", [], false);
  }

  let imageUrl = "";
  if (req.file) {
    try {
      const stream = Readable.from(req.file.buffer);
      const uploadResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });
      imageUrl = uploadResponse.secure_url;
    } catch (error) {
      logger.error("Error uploading image:", error);
      return createResponse(res, 500, "Error uploading image", [], false);
    }
  }

  // Dynamically select delivery admin
  const deliveryAdmins = await User.find({ category: "DeliveryAdmin" });
  if (!deliveryAdmins || deliveryAdmins.length === 0) {
    return createResponse(res, 500, "No delivery admin available", [], false);
  }
  const deliveryAdmin = deliveryAdmins[0]._id;

  const seller = req.user.id;

  const product = await Product.create({
    name,
    description,
    price: Number(price),
    status,
    image: imageUrl,
    seller,
    deliveryAdmin,
    quantityAvailable: Number(quantityAvailable),
  });

  logger.info("Product added successfully");
  return createResponse(res, 201, "Product added successfully", product, true);
});  



 
const getProducts = asyncHandler(async (req, res) => {
  logger.info("Request to productController.getProducts has entered");
  logger.info("Logged-in user info: " + JSON.stringify(req.user));

  try {
    let products;
    if (req.user.category === "Seller") {
      products = await Product.find({ seller: req.user.id });
      logger.info("Fetched seller's products");
    } else {
      products = await Product.find();
      logger.info("Fetched all products");
    }

    if (!products || products.length === 0) {
      return createResponse(res, 404, "No products found", [], false);
    }

    logger.info("Products fetched successfully");
    return createResponse(res, 200, "Products fetched successfully", products, true);
  } catch (error) {
    logger.error("Error fetching products:", error);
    return createResponse(res, 500, "Error fetching products", [], false);
  }
});

module.exports = { addProduct, getProducts };
