const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const configSchema = new Schema({
  siteCommission: {
    type: Number,
    required: true,
    default: 0.1,
  },
  loyaltyScheme: {
    type: [
      new Schema({
        name: String,
        minPoints: Number,
        maxPoints: Number,
        gift: Number,
      }),
    ],
    default: [
      {
        name: 'Bronze',
        minPoints: 30,
        maxPoints: 99,
        gift: 0.05,
      },
      {
        name: 'Silver',
        minPoints: 100,
        maxPoints: 199,
        gift: 0.1,
      },
      {
        name: 'Gold',
        minPoints: 200,
        maxPoints: 299,
        gift: 0.15,
      },
      {
        name: 'Platinum',
        minPoints: 300,
        maxPoints: Infinity,
        gift: 0.2,
      },
    ],
  },
});
module.exports = mongoose.model('Config', configSchema);
