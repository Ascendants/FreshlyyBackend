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
        badge: String,
      }),
    ],
    default: [
      {
        name: 'Bronze',
        minPoints: 30,
        maxPoints: 99,
        gift: 0.05,
        badge:
          'https://firebasestorage.googleapis.com/v0/b/freshlyy-437ac.appspot.com/o/Branding%2Fmbronze.png?alt=media&token=c1f836b0-314e-4c28-a4e9-063265e2b25c',
      },
      {
        name: 'Silver',
        minPoints: 100,
        maxPoints: 199,
        gift: 0.1,
        badge:
          'https://firebasestorage.googleapis.com/v0/b/freshlyy-437ac.appspot.com/o/Branding%2Fmsilver.png?alt=media&token=d2006753-c67e-40ce-83db-c344df83b299',
      },
      {
        name: 'Gold',
        minPoints: 200,
        maxPoints: 299,
        gift: 0.15,
        badge:
          'https://firebasestorage.googleapis.com/v0/b/freshlyy-437ac.appspot.com/o/Branding%2Fmgold.png?alt=media&token=8a789005-6bc8-4334-b9bf-76fc9d68e3ed',
      },
      {
        name: 'Platinum',
        minPoints: 300,
        maxPoints: Infinity,
        gift: 0.2,
        badge:
          'https://firebasestorage.googleapis.com/v0/b/freshlyy-437ac.appspot.com/o/Branding%2Fmplatinum.png?alt=media&token=c1f9fecc-8bd1-4730-9d86-e63dcb67ef5e',
      },
    ],
  },
});
module.exports = mongoose.model('Config', configSchema);
