const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Location = require('./Location');
const BankAccount = require('./BankAccount');
const userSchema = new Schema({
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    default: 'O',
  },
  dob: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  nic: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Suspended', 'Deleted', 'Banned'],
  },
  profilePicUrl: {
    type: new Schema(
      {
        imageUrl: {
          type: String,
          required: true,
        },
        placeholder: {
          type: String,
          required: true,
        },
      },
      { _id: false }
    ),
    required: true,
    default: {
      imageUrl:
        'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/UserImages%2Fuser.svg?alt=media&token=e71a192a-5c46-4025-b1f9-1391c7ad05ac',
      blurHash: 'LDH{HBt600Rj0LWB_3ofXNjs_Mj[',
    },
  },
  bAddress: {
    type: String,
    required: true,
  },
  stripeId: {
    type: String,
    required: true,
    default: 'null',
  },
  farmer: new Schema(
    {
      occupation: {
        type: String,
        required: true,
      },
      accCashEarnings: {
        type: Number,
        required: true,
        default: 0,
      },
      accTotalEarnings: {
        type: Number,
        required: true,
        default: 0,
      },
      accCommissionCharges: {
        type: Number,
        required: true,
        default: 0,
      },
      accCouponCharges: {
        type: Number,
        required: true,
        default: 0,
      },
      withdrawable: {
        type: Number,
        required: true,
        default: 0,
      },
      lastBalanceUpdate: {
        type: Date,
        default: null,
      },
      negativeBalanceSince: {
        type: Date,
        default: null,
      },
      hasVehicle: {
        type: Boolean,
        required: true,
        default: false,
      },
      maxDeliDistance: {
        type: Number,
        required: true,
        default: 0,
      },
      nicUrl: {
        type: String,
        required: true,
      },
      deliveryCharge: {
        type: Number,
        required: true,
        default: 50,
      },
      saleLocation: {
        type: Location,
      },
      followers: {
        type: [ObjectId],
        min: null,
      },
      status: {
        type: String,
        required: true,
        default: 'Quarantined',
        enum: ['Active', 'Suspended', 'Deleted', 'Banned', 'Quarantined'],
      },
      finStatus: {
        type: String,
        required: true,
        default: 'Active',
        enum: ['Active', 'Suspended'],
      },
      bankAccount: BankAccount,
    },
    { _id: false }
  ),
  customer: new Schema(
    {
      slctdLocation: {
        type: Location,
      },
      locations: {
        type: [Location],
      },
      following: {
        type: [ObjectId],
        min: null,
      },
      cart: [
        new Schema(
          {
            farmer: {
              type: ObjectId,
              required: true,
            },
            distance: {
              type: Number,
              required: true,
              default: 0,
            },
            costPerKM: {
              type: Number,
              required: true,
              default: 0,
            },
            items: [
              new Schema(
                {
                  item: {
                    type: ObjectId,
                    required: true,
                  },
                  qty: {
                    type: Number,
                    required: true,
                  },
                  dateAdded: {
                    type: Date,
                    required: true,
                    default: () => new Date(),
                  },
                },
                { _id: false }
              ),
            ],
          },
          { _id: false }
        ),
      ],
      wishList: [
        new Schema(
          {
            farmer: {
              type: ObjectId,
              required: true,
            },
            distance: {
              type: Number,
              required: true,
              default: 0,
            },
            costPerKM: {
              type: Number,
              required: true,
              default: 0,
            },
            items: [
              new Schema(
                {
                  item: {
                    type: ObjectId,
                    required: true,
                  },
                  qty: {
                    type: Number,
                    required: true,
                  },
                  dateAdded: {
                    type: Date,
                    required: true,
                    default: () => new Date(),
                  },
                },
                { _id: false }
              ),
            ],
          },
          { _id: false }
        ),
      ],
    },
    { _id: false }
  ),
  accessLevel: {
    type: String,
    required: true,
    default: 'Customer',
    enum: ['Customer', 'Farmer', 'Admin', 'SAdmin'],
  },
  dateAdded: {
    type: Date,
    required: true,
    default: () => Date.now(),
  },
});

module.exports = mongoose.model('User', userSchema);
