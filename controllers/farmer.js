const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const { ObjectId } = require("mongodb");

exports.getHello = async (req, res, next) => {
  console.log("Hello");
  res.status(200).json({ message: "Hello" });
};

exports.getDashboard = async (req, res, next) => {
  // const data = {
  // 	fname: 'Nadun',
  // 	lname: 'Fernando',
  // 	imageUrl:
  // 		'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/UserImages%2Fkom.jpg?alt=media&token=49a88f0c-ab79-4d84-8ddb-ada16a2b0101',
  // };
  const orders = await Order.find({ farmer: req.user._id }); //gives all orders belonging to farmer;
  const products = Product.find({ farmer: req.user._id });
  res.status(200).json({ message: "Success", user: req.user });
};

exports.insertProduct = async (req, res, next) => {
  const user = await User.findOne({ email: "komuthu@freshlyy.com" });
  console.log(req.body);
  const { price, qtyAvailable, description, title, minQtyIncrement } = req.body;
  const newProduct = new Product({
    title: title,
    status: "Paused",
    description: description,
    price: price,
    overallRating: 3,
    minQtyIncrement: minQtyIncrement,
    unit: "KG",
    farmer: user,
    qtyAvailable: qtyAvailable,
    imageUrls: [
      {
        imageUrl:
          "https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa",
        placeholder: "#9c7954",
      },
    ],
  });

  if (minQtyIncrement >= qtyAvailable) {
    return res
      .status(400)
      .json({ message: "minQtyIncrement should be less than qtyAvailable" });
  }
  if (!isNaN(parseFloat(title))) {
    return res.status(400).json({ message: "Title should not be a number" });
  }
  if (isNaN(price) || isNaN(qtyAvailable)) {
    res.status(400).json({ message: "Price and quantity must be numbers" });
    return;
  }
  newProduct.publicUrl = (
    newProduct.title.replace(/ /g, "_") +
    "_" +
    ObjectId(newProduct)
  ).toLowerCase();
  newProduct.save((err, savedProduct) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: "Error saving product" });
    } else {
      res.status(200).json({ message: "Success", product: savedProduct });
    }
  });
};
exports.getSellingProduct = async (req, res) => {
  try {
    console.log("hii");
    // console.log(req.productId);
    const productId = "63f4d385b1a06dad48ec25ba";
    const product = await Product.findById(productId);
    console.log(product);
    res.status(200).json({ message: "Success", product: product });
  } catch (error) {
    console.log(error);
  }
};

// exports.updateproductdetails = async (req, res, next) => {
//   async function updateProduct(productId, updatedFields) {
//     try {
//       // find the product by ID
//       const product = await Product.findById(productId);

//       // update the product with new values
//       Object.assign(product, updatedFields);

//       // save the updated product to the database
//       await product.save();

//       console.log("Product updated successfully!");
//     } catch (err) {
//       console.error(err);
//     }
//   }
async function updateProduct(productId, updatedFields) {
  try {
    const product = await Product.findByIdAndUpdate(productId, updatedFields);

    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  } catch (err) {
    throw err;
  }
}

exports.updateproductdetails = async (req, res, next) => {
  const user = await User.findOne({ email: "komuthu@freshlyy.com" });
  // console.log(req.body);
  console.log(req.params.productId);

  try {
    const productId = req.params.productId;
    const updatedFields = req.body;
    console.log(productId);
    console.log(updatedFields);
    await updateProduct(productId, updatedFields);
    res.status(200).json({ message: "Product updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating product" });
  }
};

//   // usage
//   const productId = "63f4d385b1a06dad48ec25ba";
//   const updatedFields = {
//     title: title,
//     status: "Paused",
//     description: description,
//     price: price,
//     overallRating: 3,
//     minQtyIncrement: minQtyIncrement,
//     unit: "KG",
//     farmer: user,
//     qtyAvailable: qtyAvailable,
//     imageUrls: [
//       {
//         imageUrl:
//           "https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa",
//         placeholder: "#9c7954",
//       },
//     ],
//   };
//   updateProduct(productId, updatedFields);
// };
