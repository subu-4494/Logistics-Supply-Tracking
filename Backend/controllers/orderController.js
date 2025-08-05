const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const asyncHandler = require("../utils/AsyncHandling");
const { logger } = require("../utils/logger");
//const { downloadFile, uploadFile } = require("../utils/PinataHandling");
const { createResponse } = require("../utils/ResponseHandling"); 


const addOrder = asyncHandler(async (req, res) => {
  logger.info("Request to addOrder has entered");
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    logger.error("Product ID and quantity are required");
    return createResponse(res, 400, "Product ID and quantity are required", [], false);
  }
 
  logger.info("Checking if product exists");
  if (!(await Product.findById(productId))) {
    logger.error("Product does not exist");
    return createResponse(res, 404, "Product does not exist", [], false);
  }
  logger.info("Product exists");

  logger.info("Checking if user is a buyer");
  if (req.user.category !== "Buyer") {
    logger.error("Only buyers can add orders");
    return createResponse(res, 403, "Only buyers can add orders", [], false);
  }
  logger.info("User is a buyer");

  logger.info("Adding order to database with pending status"); 
  const buyer = req.user.id;
  const product = await Product.findById(productId);  
  if(product.quantityAvailable<quantity){ 
       logger.info("there are not sufficient unit availble for this Product");   
       return  createResponse(res, 403, "Not Availble to this quantity", [], false); 
  }    
   product.quantityAvailable-=quantity; // update the product availblity..
   await product.save(); // save the updates...
      

   const order = await Order.create({
    product,
    quantity,
    buyer,
    seller: product.seller,
    deliveryAdmin: product.deliveryAdmin,
    current_owner: product.seller,
       });    
  logger.info("Order added successfully");   

  logger.info("Updating Delivery admin's order entries"); 

  const deliveryAdmin = await User.findById(product.deliveryAdmin); 

   logger.info("Current queue length: " + deliveryAdmin.product_request_queue.length);
deliveryAdmin.product_request_queue.push(order._id);
logger.info("After push, new length: " + deliveryAdmin.product_request_queue.length); 

      try {
  await deliveryAdmin.save();
  logger.info("Delivery admin saved successfully");
} catch (err) {
  logger.error("Error saving delivery admin:", err);
} 
  logger.info("Order request made to delivery Admin successfully");

  return createResponse(res, 201, "Order request made to delivery Admin successfully", order, true);
});    
 


 


const addTrack = asyncHandler(async (req, res) => {
  logger.info("Request to addTrack has entered");
    const { orderId, middlemen } = req.body;    

  if (!orderId) {
    logger.error("Order ID is required");
    return createResponse(res, 400, "Order ID is required", [], false);
  }

  logger.info("Checking if order exists");
    const order = await Order.findById(orderId);  // cheacking if order exist or not.. (delevryman want to see an order )

  if (!order) {
    logger.error("Order does not exist");
    return createResponse(res, 404, "Order does not exist", [], false);
  }
  logger.info("Order exists");

  logger.info("Checking if user is a delivery Admin");
  if (req.user.category !== "DeliveryAdmin") {
    logger.error("Only delivery Admin can add track");
    return createResponse(res, 403, "Only delivery Admin can add track", [], false);
  }
  logger.info("User is a delivery Admin");

  logger.info(
    "Checking if order exists in the queue of the current delivery owner"
  );         

         // 🔍 Log who is making the request vs. who owns the order
logger.info("Logged-in delivery admin ID: " + req.user.id); 
logger.info("Order's delivery admin ID: " + order.deliveryAdmin);  

// 🧠 Fetch deliveryAdmin based on order
const deliveryAdmin = await User.findById(order.deliveryAdmin);

// ❗ Validate that the order is in this admin's queue
if (!deliveryAdmin.product_request_queue.includes(orderId)) {
  logger.error("Order does not exist in the delivery admin's queue");
  return createResponse(res, 400, "Order does not exist in the delivery admin's queue", [], false);
}



  logger.info("Order does exist in the delivery admin's queue");

  logger.info("Adding track to order");
  order.track.push({
    recieve_status: true,
    give_status: false,
    owner: order.seller,
  });   
  
  logger.info("Seller added to track"); 

  logger.info("Adding middlemen to track"); 
  if (middlemen && Array.isArray(middlemen)) {
    middlemen.forEach((middleman) => {
      order.track.push({
        recieve_status: false,
        give_status: false,
        owner: middleman,
      });
    }); 
  }
  logger.info("Middlemen added to track");

  logger.info("Adding buyer to track");
  order.track.push({
    recieve_status: false,
    give_status: true,
    owner: order.buyer,
  });  

  logger.info("Buyer added to track"); 

  await order.save(); 
  logger.info("Track added successfully");

  logger.info("Updating user's order entries"); 

  const seller = await User.findById(order.seller); 
  seller.product_left_to_deliver.push({
    order: order._id,
    recieve_status: true,
    give_status: false,
  }); 
  await seller.save();
  logger.info("Seller's order entry updated");

  const buyer = await User.findById(order.buyer);
  buyer.product_left_to_deliver.push({
    order: order._id,
    recieve_status: false,
    give_status: true,
  });
  await buyer.save();
  logger.info("Buyer's order entry updated");

   if (middlemen && Array.isArray(middlemen)) {
    for (const middlemanId of middlemen) {
      const middleman = await User.findById(middlemanId); 
      middleman.product_left_to_deliver.push({
        order: order._id,
        recieve_status: false,
        give_status: false,
      });
      await middleman.save();
      logger.info(`Middleman's order entry updated for user ${middlemanId}`);
    }
  } 

  logger.info("Changing the order status to accepted");
  order.accepting_status = "accepted"; 
  console.log("Track before saving:", order.track);

  await order.save();
  logger.info("Order status changed to accepted"); 

  logger.info("Removing order from delivery admin's product request queue");
  deliveryAdmin.product_request_queue =
    deliveryAdmin.product_request_queue.filter(
      (id) => id.toString() !== orderId.toString()
    );   

    console.log("Track before saving:", order.track);

  await deliveryAdmin.save();   
  logger.info("Order removed from delivery admin's product request queue");

  const track_array=order.track.map((track) => ({
    owner: track.owner,
    recieve_status: track.recieve_status,
    give_status: track.give_status,
  }));   






  logger.info("Uploading the track on web3");    
  // Upload the track on web3
  const response = await uploadFile(track_array);
  if(!response){
    logger.error("Error in uploading track on web3");
    return createResponse(res, 500, "Error in uploading track on web3", [], false);
  }
  logger.info("Track uploaded on web3");
  const web3_id = response?.IpfsHash;
  order.web3_id = web3_id; 
  console.log("Track before saving:", order.track);

  await order.save();
  logger.info("Track uploaded on web3 and order updated");

  logger.info("Request to addTrack has exited");

  return createResponse(res, 200, "Track added and order updated successfully", { order, web3_id }, true);
});      
 

 








const orders_in_queue = asyncHandler(async (req, res) => {
  logger.info("Request to getOrders_in_queue has entered");

  logger.info("Checking if user is a delivery Admin"); 
  if (req.user.category !== "DeliveryAdmin") {
    logger.error("Only delivery Admin can get orders in queue"); 
    return createResponse(res, 403, "Only delivery Admin can get orders in queue", [], false);
  }
  logger.info("User is a delivery Admin");

  logger.info("Getting orders in queue");
  const deliveryAdmin = await User.findById(req.user.id).populate({
    path: "product_request_queue", 
    populate: [
      { path: "product", select: "name" },
      { path: "buyer", select: "name" },
      { path: "seller", select: "name" }
    ]
  }); 
  const orders = deliveryAdmin.product_request_queue;
  logger.info("Orders in queue fetched successfully");

  return createResponse(res, 200, "Orders in queue fetched successfully", orders, true); 
}); 






const orders_to_deliver = asyncHandler(async (req, res) => {
  logger.info("Request to getOrders_to_deliver has entered");

  logger.info("Getting orders to deliver");
  const seller = await User.findById(req.user.id).populate(
    "product_left_to_deliver"
  ); 
  const orders = seller.product_left_to_deliver;
  logger.info("Orders to deliver fetched successfully");

  logger.info("Request to getOrders_to_deliver has exited");

  return createResponse(res, 200, "Orders to deliver fetched successfully", orders, true);
});  
  
 

// here we passed the product to the agents until it reached to the buyer and update the product_left array 
const verifyTransaction = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return createResponse(res, 400, "Order ID is required", [], false);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return createResponse(res, 404, "Order does not exist", [], false);
  }

  const currentOwnerIndex = order.track.findIndex(
    (track) => track.owner.toString() === order.current_owner.toString()
  );

  if (
    currentOwnerIndex === -1 ||
    currentOwnerIndex === order.track.length - 1
  ) {
    return createResponse(res, 400, "Invalid transaction verification", [], false);
  }

  // Ensure OTP is verified for the next transfer
  if (
    !order.transfer_otp?.isVerified ||
    order.transfer_otp?.forTrackIndex !== currentOwnerIndex + 1
  ) {
    return createResponse(res, 400, "OTP not verified for this transaction", [], false);
  } 

  const nextOwner = order.track[currentOwnerIndex + 1].owner;

  order.track[currentOwnerIndex].give_status = true;
  order.track[currentOwnerIndex + 1].recieve_status = true;
  order.current_owner = nextOwner;

  // Reset OTP
  order.transfer_otp = undefined;

  // Save the current state before possibly deleting
  await order.save();

  const currentOwner = await User.findById(order.track[currentOwnerIndex].owner);
  const nextOwnerUser = await User.findById(nextOwner);

  const currentOwnerEntry = currentOwner.product_left_to_deliver.find(
    (entry) => entry.order.toString() === orderId.toString()
  );
  if (currentOwnerEntry) currentOwnerEntry.give_status = true;
  await currentOwner.save();

  const nextOwnerEntry = nextOwnerUser.product_left_to_deliver.find(
    (entry) => entry.order.toString() === orderId.toString()
  );
  if (nextOwnerEntry) nextOwnerEntry.recieve_status = true;
  await nextOwnerUser.save();

  // ✅ DELETE order if final owner (buyer) has now received the product
  const isBuyer = currentOwnerIndex + 1 === order.track.length - 1;
  if (isBuyer) {
    await Order.findByIdAndDelete(orderId);
    return createResponse(res, 200, "Product successfully delivered to buyer and order deleted", [], true);
  }

  return createResponse(res, 200, "Transaction verified successfully", { order }, true);
});
 


  // logger.info("Uploading new details on web3");
  // // Upload the updated track on web3
  // const track_array=order.track.map((track) => ({
  //   owner: track.owner,
  //   recieve_status: track.recieve_status,
  //   give_status: track.give_status,
  // }));
  // const response = await uploadFile(track_array);
  // if(!response){
  //   logger.error("Error in uploading track on web3");
  //   return createResponse(res, 500, "Error in uploading track on web3", [], false);
  // }
  // logger.info("Track uploaded on web3");
  // const web3_id = response?.IpfsHash;
  // order.web3_id = web3_id;
  // await order.save();
  // logger.info("Track uploaded on web3 and order updated");

  // // Check if all users in the track have both statuses true
  // logger.info("Checking if all statuses are true");
  // const allStatusesTrue = order.track.every(
  //   (track) => track.recieve_status && track.give_status
  // );

  // if (allStatusesTrue) {
  //   order.delivery_status = "delivered";
    
  //   // Remove order from all users' product_left_to_deliver 
  //    const usersInTrack = order.track.map(t => t.owner);
  //   await User.updateMany(
  //     { _id: { $in: usersInTrack } },
  //     { $pull: { product_left_to_deliver: { order: orderId } } }
  //   );

  //   // Delete the order
  //   await Order.findByIdAndDelete(orderId);
    
  //   logger.info("Order removed from database as delivery is complete");
  // }
  // logger.info("Request to verifyTransaction has exited");

  // return createResponse(res, 200, "Transaction verified successfully", { order, web3_id }, true);

 



 

const getTrack = asyncHandler(async (req, res) => {
  logger.info("Request to getTrack has entered"); 
  const { orderId } = req.body; 

  if (!orderId) {
    logger.error("Order ID is required");
    return createResponse(res, 400, "Order ID is required", [], false);
  } 


  const order = await Order.findById(orderId); 
  if (!order) {
    logger.error("Order not found");
    return createResponse(res, 404, "Order not found", [], false);
  }

  // Check if user is part of this order's track 
  const isUserInTrack = order.track.some(t => t.owner.toString() === req.user._id.toString());
  if (!isUserInTrack) {
    logger.error("User not authorized to view this track");
    return createResponse(res, 403, "Not authorized to view this track", [], false);
  }

  logger.info("Track fetched successfully");
  return createResponse(res, 200, "Track fetched successfully", order.track, true);
});   

 



const getMiddlemen = asyncHandler(async (req, res) => {
  logger.info("Request to get all middlemen users");
  
  if (req.user.category !== "DeliveryAdmin") {
    logger.error("Only delivery admin can access middlemen list");
    return createResponse(res, 403, "Unauthorized access", [], false);
  }  


  const middlemen = await User.find({ category: "Middleman" }).select('_id name');
  logger.info("Middlemen list fetched successfully");
  
  return createResponse(res, 200, "Middlemen fetched successfully", middlemen, true);
});  



// I WILL START FORM HERE ... TOMORROW .....

   const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params; 
   console.log("orderId from params:", orderId);


  try {
    const order = await Order.findById(orderId)
      .populate('product', 'name')
      .populate('buyer', 'name')
      .populate('seller', 'name');
       console.log("Order found:", order);

    if (!order) {
      return createResponse(res, 404, "Order not found", null, false);
    }

      if (order.buyer.toString() !== req.user._id.toString()) {
      return createResponse(res, 403, "Not authorized to view this order", null, false);
    }

    return createResponse(res, 200, "Order fetched successfully", order, true);
  } catch (error) {
    console.error("Error fetching order:", error.message);
    return createResponse(res, 400, "Invalid Order ID format", null, false);
  }
});


 

const generateTransferOTP = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  
  if (!order) {
    return createResponse(res, 404, "Order not found", [], false);
  }

  // Find current owner's position in track
  const currentOwnerIndex = order.track.findIndex(
    t => t.owner.toString() === req.user._id.toString()
  );

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();  
  
  order.transfer_otp = {
    code: otp,
    generatedAt: new Date(),
    forTrackIndex: currentOwnerIndex + 1
  };  
  
  await order.save(); 
  
  return createResponse(res, 200, "OTP generated successfully", { otp }, true);
});  
  

const verifyTransferOTP = asyncHandler(async (req, res) => {
  const { orderId, otp } = req.body;
  const order = await Order.findById(orderId);

  if (!order?.transfer_otp?.code) {
    return createResponse(res, 400, "No OTP found for this order", [], false);
  }

  if (order.transfer_otp.code !== otp) {
    return createResponse(res, 400, "Invalid OTP", [], false);
  }

  const otpAge = (new Date() - order.transfer_otp.generatedAt) / 1000 / 60;
  if (otpAge > 15) {
    return createResponse(res, 400, "OTP expired", [], false);
  }

  // Mark the OTP as verified
  order.transfer_otp.isVerified = true;
  await order.save();

  return createResponse(res, 200, "OTP verified successfully", { order }, true);
});



const getOrderTransactions = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  
  if (!order) {
    return createResponse(res, 404, "Order not found", [], false);
  }

  // Check if user is part of this order's track
  const isUserInTrack = order.track.some(t => t.owner.toString() === req.user._id.toString());
  if (!isUserInTrack) {
    return createResponse(res, 403, "Not authorized to view transactions", [], false);
  }

  // Get all transactions with OTP details
  const transactions = {
    orderId: order._id,
    currentOtp: order.transfer_otp,
    productName: order.product.name,
    track: order.track
  };

  return createResponse(res, 200, "Transactions fetched successfully", transactions, true);
}); 



module.exports = { 
  
  addOrder,
  addTrack,
  orders_in_queue,
  orders_to_deliver,
  verifyTransaction,
  getTrack,
  getMiddlemen,
  getOrderById,
  generateTransferOTP,
  verifyTransferOTP,
  getOrderTransactions,
};   
 






