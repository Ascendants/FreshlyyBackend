const mongoose = require('mongoose');
const notificationSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: Number,
      required: true,
    },
    sessionActivity: { type: Date, expires: '3600s', default: Date.now },
  },
  { _id: false }
);
module.exports = notificationSchema;
