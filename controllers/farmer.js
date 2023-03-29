const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { ObjectId } = require('mongodb');
const Bank = require('../models/Bank');
const SupportTicket = require('../models/SupportTicket');
const Coupon = require('../models/Coupon');

const { validationResult } = require('express-validator');

exports.getHello = async (req, res, next) => {
  console.log('Hello');
  res.status(200).json({ message: 'Hello' });
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
  res.status(200).json({ message: 'Success', user: req.user });
};

exports.insertProduct = async (req, res, next) => {
  const user = await User.findOne({ email: 'komuthu@freshlyy.com' });
  console.log(req.body);
  const { price, qtyAvailable, description, title, minQtyIncrement } = req.body;
  const newProduct = new Product({
    title: title,
    status: 'Paused',
    description: description,
    price: price,
    overallRating: 3,
    minQtyIncrement: minQtyIncrement,
    unit: 'KG',
    farmer: user,
    qtyAvailable: qtyAvailable,
    imageUrls: [
      {
        imageUrl:
          'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa',
        placeholder: '#9c7954',
      },
    ],
  });

  if (minQtyIncrement >= qtyAvailable) {
    return res
      .status(400)
      .json({ message: 'minQtyIncrement should be less than qtyAvailable' });
  }
  if (!isNaN(parseFloat(title))) {
    return res.status(400).json({ message: 'Title should not be a number' });
  }
  if (isNaN(price) || isNaN(qtyAvailable)) {
    res.status(400).json({ message: 'Price and quantity must be numbers' });
    return;
  }
  newProduct.publicUrl = (
    newProduct.title.replace(/ /g, '_') +
    '_' +
    ObjectId(newProduct)
  ).toLowerCase();
  newProduct.save((err, savedProduct) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: 'Error saving product' });
    } else {
      res.status(200).json({ message: 'Success', product: savedProduct });
    }
  });
};
exports.getSellingProduct = async (req, res) => {
  try {
    console.log('hii');
    // console.log(req.productId);
    const productId = '63f4d385b1a06dad48ec25ba';
    const product = await Product.findById(productId);
    console.log(product);
    res.status(200).json({ message: 'Success', product: product });
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
      throw new Error('Product not found');
    }

    return product;
  } catch (err) {
    throw err;
  }
}

exports.updateproductdetails = async (req, res, next) => {
  const user = await User.findOne({ email: 'komuthu@freshlyy.com' });
  // console.log(req.body);
  console.log(req.params.productId);

  try {
    const productId = req.params.productId;
    const updatedFields = req.body;
    console.log(productId);
    console.log(updatedFields);
    await updateProduct(productId, updatedFields);
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating product' });
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

exports.supportTicket = (req, res, next) => { 
  // console.log(req.body);
  const { name, number, issue, desc, email, orderId } = req.body;
  const userEmail = req.user.email;

  const newSupportTicket = new SupportTicket({
    userEmail: userEmail,
    name: name,
    number: number,
    issue: issue,
    description: desc,
    email: email,
    orderId: orderId,
  });

  newSupportTicket.save((err, ticket) => {
    if (err) {
      console.log(err);
      res.status(500).json({message: 'Can not save data', error: err});
    } else {
      console.log('success');
      res.status(200).json({ message: 'Success', id: ticket._id });
    }
  });
};

exports.getSupportTicket = async (req, res) => {
  const ticketId = req.params.id;
  console.log(ticketId);
  try {
    const supportTicket = await SupportTicket.findById(ticketId);
    res.status(200).json({message:"Success", supportTicket: supportTicket});
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'Error fetching supportTicket from database' });
  }
}

exports.getSupportTickets = async (req, res) => {
  try {
    const supportTickets = await SupportTicket.find({});
    res.status(200).json({ message: 'Success', supportTicket: supportTickets });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'Error fetching supportTickets from database' });
  }
};

exports.updateSupportTicket = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const supportTicket = await SupportTicket.findByIdAndUpdate(
      { _id: id },
      { status },
      { new: true }
    );
    res.json(supportTicket);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error updating supportTicket');
  }
};

exports.deleteSupportTicket = async (req, res) => {
  const { id } = req.params;
  try {
    await SupportTicket.findOneAndDelete({ _id: id });
    res.sendStatus(204);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error deleting supportTicket');
  }
};

exports.createCoupon = (req, res, next) => {
  // console.log(req.body);
  const { presentage, cCode, cDate, eDate } = req.body;
  const userEmail = req.user.email;

  const newCoupon = new Coupon({
    userEmail: userEmail,
    presentage: presentage,
    cCode: cCode,
    cDate: cDate,
    eDate: eDate,
  });

  newCoupon.save((err) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error saving data');
    } else {
      console.log('success');
      res.status(200).json({ message: 'Success' });
    }
  });
};

exports.verifyCouponCode = async (req, res, next) => {
  console.log('hiii');
  const cCode = req.body.cCode;
  console.log(cCode);
  try {
    const coupon = await Coupon.find({cCode:cCode});
    // console.log(coupon);
    if(coupon.length > 0){
      res.status(200).json({ message: 'Code is already in the database', cCode:cCode, isExist: true });
    } else {
      res.status(200).json({ message: 'Code is unique', cCode:cCode, isExist: false });
    }
  } catch (error) {
    console.log(error);
  }
  
}

exports.getBanks = async (req, res, next) => {
  const banks = await Bank.find();
  res.status(200).json({ message: 'Success', banks: banks });
};

exports.postCreateBank = async (req, res, next) => {
  const bank = new Bank({
    BankName: 'Union Bank',
    BankAccountNumFormat: /\d{16}/,
  });
  bank.save();

  res.status(200).json({ message: 'Success' });
};

exports.postSaveAccount = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: 'Vaildation Error' });
  try {
    const { bankId, AccountName, AccountNumber } = req.body;
    const bank = await Bank.findById(bankId);
    if (!bank) {
      return res.status(422).json({ message: 'Bank not found' });
    }
    if (!new RegExp(bank.BankAccountNumFormat).test(AccountNumber)) {
      return res.status(422).json({ message: 'Invalid account number' });
    }
    const account = {
      Bank: bank._id,
      AccountName: AccountName,
      AccountNumber: AccountNumber,
    };
    // console.log(req.user);
    req.user.farmer.bankAccount = account;
    req.user.save();
    res.status(200).json({ message: 'Success' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Something went wrong' });
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
