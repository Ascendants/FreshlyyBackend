const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Location = require('./Location');

const customerSchema = new Schema({
  slctdLocation: {
    type: Location.schema,
  },
  locations: {
    type: [Location.schema],
  },
});
module.exports = mongoose.model('Customer', customerSchema);
