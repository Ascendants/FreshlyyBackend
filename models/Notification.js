const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const notificationSchema = mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
  },
  customer: {
    type: Boolean,
    required: true,
    default: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
    required: true,
  },
  read: {
    type: Date,
    default: null,
  },
});
notificationSchema.index({ read: 1 }, { expireAfterSeconds: 1296000 });
module.exports = mongoose.model('Notification', notificationSchema);
