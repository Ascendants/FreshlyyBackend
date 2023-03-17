const express = require("express");

const farmerController = require("../controllers/farmer");

const router = express.Router();

// router.get('/product/:purl', publicController.getProduct);
// router.get('/user', publicController.createUser);
router.get("/hello", farmerController.getHello);
router.get("/dashboard", farmerController.getDashboard);
router.post("/insert-product", farmerController.insertProduct);
router.get("/get-selling-product", farmerController.getSellingProduct);
router.post(
  "/update-product/:productId",
  farmerController.updateproductdetails
);
module.exports = router;
