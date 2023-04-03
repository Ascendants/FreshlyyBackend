const express = require("express");

const farmerController = require("../controllers/farmer");

const router = express.Router();

const { body } = require("express-validator");

// router.get('/product/:purl', publicController.getProduct);
// router.get('/user', publicController.createUser);
router.get("/hello", farmerController.getHello);
router.get("/dashboard", farmerController.getDashboard);

router.get("/get-banks", farmerController.getBanks);
router.get("/adminDashboard", farmerController.getAdmindashboard);
// router.get("/get-selling-product", farmerController.updateproductdetails);
router.post("/insert-product", farmerController.insertProduct);
router.get("/selling-product/:productId", farmerController.getSellingProduct);
router.post(
  "/update-product/:productId",
  farmerController.updateProductDetails
);

router.post(
  "/save-account",
  [
    body("AccountName").trim().isLength({ min: 2, max: 20 }),
    body("AccountNumber").trim().isNumeric(),
    body("bankId").trim(),
  ],
  farmerController.postSaveAccount
);

//test route. must be removed in production
// router.post('/add-bank', farmerController.postCreateBank);

module.exports = router;
